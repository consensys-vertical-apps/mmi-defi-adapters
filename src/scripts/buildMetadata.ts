import { promises as fs } from 'fs'
import path from 'path'
import { Command } from 'commander'
import partition from 'lodash/partition'
import { parse, print, types, visit } from 'recast'
import { supportedProtocols } from '../adapters'
import { Protocol } from '../adapters/protocols'
import { AdaptersController } from '../core/adaptersController'
import { Chain, ChainName } from '../core/constants/chains'
import { IMetadataBuilder } from '../core/decorators/cacheToFile'
import { ProviderMissingError } from '../core/errors/errors'
import { pascalCase } from '../core/utils/caseConversion'
import { CustomJsonRpcProvider } from '../core/utils/customJsonRpcProvider'
import { logger } from '../core/utils/logger'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import { Json } from '../types/json'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'
import n = types.namedTypes
import b = types.builders

export function buildMetadata(
  program: Command,
  chainProviders: Record<Chain, CustomJsonRpcProvider>,
  adaptersController: AdaptersController,
) {
  program
    .command('build-metadata')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .showHelpAfterError()
    .action(async ({ protocols, chains }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterChainIds = multiChainFilter(chains)

      for (const [protocolIdKey, supportedChains] of Object.entries(
        supportedProtocols,
      )) {
        const protocolId = protocolIdKey as Protocol
        if (filterProtocolIds && !filterProtocolIds.includes(protocolId)) {
          continue
        }

        for (const [chainIdKey, _] of Object.entries(supportedChains)) {
          const chainId = +chainIdKey as Chain
          if (filterChainIds && !filterChainIds.includes(chainId)) {
            continue
          }

          const provider = chainProviders[chainId]

          if (!provider) {
            logger.error({ chainId }, 'No provider found for chain')
            throw new ProviderMissingError(chainId)
          }

          const chainProtocolAdapters =
            adaptersController.fetchChainProtocolAdapters(chainId, protocolId)

          for (const [_, adapter] of chainProtocolAdapters) {
            if (!isIMetadataBuilder(adapter)) {
              continue
            }

            const { metadata, fileDetails } = (await adapter.buildMetadata(
              true,
            )) as {
              metadata: Json
              fileDetails: {
                protocolId: Protocol
                productId: string
                chainId: Chain
                fileKey: string
              }
            }

            await writeMetadataToFile({
              ...fileDetails,
              metadata,
            })

            await addStaticImport(fileDetails)
          }
        }
      }
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIMetadataBuilder(value: any): value is IMetadataBuilder {
  return (
    typeof value === 'object' &&
    'buildMetadata' in value &&
    typeof value['buildMetadata'] === 'function'
  )
}

async function writeMetadataToFile({
  protocolId,
  productId,
  chainId,
  fileKey,
  metadata,
}: {
  protocolId: Protocol
  productId: string
  chainId: Chain
  fileKey: string
  metadata: Json
}) {
  const newFilePath = path.resolve(
    `src/adapters/${protocolId}/products/${productId}/metadata/${ChainName[chainId]}.${fileKey}.json`,
  )

  await fs.mkdir(path.dirname(newFilePath), { recursive: true })

  await fs.writeFile(newFilePath, JSON.stringify(metadata, null, 2), 'utf-8')
}

async function addStaticImport({
  protocolId,
  productId,
  chainId,
  fileKey,
}: {
  protocolId: Protocol
  productId: string
  chainId: Chain
  fileKey: string
}) {
  const adapterMetadataFile = path.resolve(
    './src/core/metadata/AdapterMetadata.ts',
  )
  const contents = await fs.readFile(adapterMetadataFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  const protocolKey = Object.keys(Protocol).find(
    (protocolKey) =>
      Protocol[protocolKey as keyof typeof Protocol] === protocolId,
  ) as keyof typeof Protocol

  const chainKey = Object.keys(Chain).find(
    (chainKey) => Chain[chainKey as keyof typeof Chain] === chainId,
  ) as keyof typeof Chain

  visit(ast, {
    visitProgram(path) {
      const programNode = path.value as n.Program

      addAdapterMetadataImport({
        programNode,
        protocolKey,
        protocolId,
        productId,
        chainKey,
        chainId,
        fileKey,
      })

      this.traverse(path)
    },
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'MetadataFiles') {
        addAdapterMetadataEntry({
          metadataFilesDeclaratorNode: node,
          protocolKey,
          productId,
          chainKey,
          fileKey,
        })
      }

      this.traverse(path)
    },
  })

  await writeCodeFile(adapterMetadataFile, print(ast).code)
}

/**
 * @description Adds a new entry to the imports for the new adapter
 *
 * @param programNode AST node for the Protocol program
 */
function addAdapterMetadataImport({
  programNode,
  protocolKey,
  protocolId,
  productId,
  chainKey,
  chainId,
  fileKey,
}: {
  programNode: n.Program
  protocolKey: keyof typeof Protocol
  protocolId: Protocol
  productId: string
  chainKey: keyof typeof Chain
  chainId: Chain
  fileKey: string
}) {
  const [importNodes, codeAfterImports] = partition(programNode.body, (node) =>
    n.ImportDeclaration.check(node),
  )

  const metadataImportEntry = importNodes.find((x) => {
    if (!n.ImportDeclaration.check(x)) {
      return false
    }

    return (
      x.specifiers![0]!.local?.name ===
      `${protocolKey}${pascalCase(productId)}${chainKey}${pascalCase(fileKey)}`
    )
  })

  if (metadataImportEntry) {
    return
  }

  const newMetadataImportEntry = buildImportAdapterMetadataEntry(
    protocolKey,
    protocolId,
    productId,
    chainKey,
    chainId,
    fileKey,
  )

  programNode.body = [
    ...importNodes,
    newMetadataImportEntry,
    ...codeAfterImports,
  ]
}

/*
import <ProtocolKey><ProductKey><ChainKey><FileKey> from '../../adapters/<protocol-id>/products/<product-id>/metadata/<chain-name>.<file-key>.json'
*/
function buildImportAdapterMetadataEntry(
  protocolKey: keyof typeof Protocol,
  protocolId: Protocol,
  productId: string,
  chainKey: keyof typeof Chain,
  chainId: Chain,
  fileKey: string,
) {
  return b.importDeclaration(
    [
      b.importDefaultSpecifier(
        b.identifier(
          `${protocolKey}${pascalCase(productId)}${chainKey}${pascalCase(
            fileKey,
          )}`,
        ),
      ),
    ],
    b.literal(
      `../../adapters/${protocolId}/products/${productId}/metadata/${ChainName[chainId]}.${fileKey}.json`,
    ),
  )
}

/**
 * @description Adds chain entries for the adapter to the supportedProtocols constant
 *
 * @param metadataFilesDeclaratorNode AST node for the supportedProtocols declarator
 */
function addAdapterMetadataEntry({
  metadataFilesDeclaratorNode,
  protocolKey,
  productId,
  chainKey,
  fileKey,
}: {
  metadataFilesDeclaratorNode: n.VariableDeclarator
  protocolKey: keyof typeof Protocol
  productId: string
  chainKey: keyof typeof Chain
  fileKey: string
}) {
  const metadataFilesNewMapNode = metadataFilesDeclaratorNode.init
  if (
    !n.NewExpression.check(metadataFilesNewMapNode) ||
    !n.ArrayExpression.check(metadataFilesNewMapNode.arguments[0])
  ) {
    throw new Error('Incorrectly typed MetadataFiles new Map expression')
  }

  const metadataEntries = metadataFilesNewMapNode.arguments[0]

  const metadataFileEntry = metadataEntries.elements.find((x) => {
    if (
      !n.ArrayExpression.check(x) ||
      x.elements.length !== 2 ||
      !n.Identifier.check(x.elements[1])
    ) {
      return false
    }

    return (
      x.elements[1].name ===
      `${protocolKey}${pascalCase(productId)}${chainKey}${pascalCase(fileKey)}`
    )
  })

  if (metadataFileEntry) {
    return
  }

  const protocolIdProp = b.objectProperty(
    b.identifier('protocolId'),
    b.memberExpression(b.identifier('Protocol'), b.identifier(protocolKey)),
  )
  const productIdProp = b.objectProperty(
    b.identifier('productId'),
    b.stringLiteral(productId),
  )
  const chainIdProp = b.objectProperty(
    b.identifier('chainId'),
    b.memberExpression(b.identifier('Chain'), b.identifier(chainKey)),
  )
  const fileKeyProp = b.objectProperty(
    b.identifier('fileKey'),
    b.stringLiteral(fileKey),
  )
  const metadataEntryKey = b.callExpression(b.identifier('metadataKey'), [
    b.objectExpression([
      protocolIdProp,
      productIdProp,
      chainIdProp,
      fileKeyProp,
    ]),
  ])
  const metadataEntryJson = b.identifier(
    `${protocolKey}${pascalCase(productId)}${chainKey}${pascalCase(fileKey)}`,
  )

  const newMetadataEntry = b.arrayExpression([
    metadataEntryKey,
    metadataEntryJson,
  ])

  metadataEntries.elements = [...metadataEntries.elements, newMetadataEntry]
}
