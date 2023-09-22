import { promises as fs } from 'fs'
import path from 'path'
import partition from 'lodash/partition'
import { parse, print, types, visit } from 'recast'
import { Protocol } from '../../adapters/protocols'
import { IProtocolAdapter } from '../../types/adapter'
import { Json } from '../../types/json'
import { Chain, ChainName } from '../constants/chains'
import { MetadataFiles, metadataKey } from '../metadata/AdapterMetadata'
import { pascalCase } from '../utils/caseConversion'
import { logger } from '../utils/logger'
import { writeCodeFile } from '../utils/writeCodeFile'
import n = types.namedTypes
import b = types.builders

export interface IMetadataBuilder {
  product: string
  buildMetadata(writeToFile?: boolean): Promise<Json>
}

export function CacheToFile({ fileKey }: { fileKey: string }) {
  return function actualDecorator(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalMethod: any,
    _context: ClassMethodDecoratorContext,
  ) {
    async function replacementMethod(
      this: IMetadataBuilder & IProtocolAdapter,
      ...args: unknown[]
    ) {
      const writeToFile = args[0] as boolean
      if (writeToFile) {
        logger.info(
          {
            protocolId: this.protocolId,
            productId: this.product,
            chainId: this.chainId,
            fileKey,
          },
          'Building metadata',
        )
        const metadataObject = await originalMethod.call(this, ...args)

        await writeMetadataToFile({
          protocolId: this.protocolId,
          productId: this.product,
          chainId: this.chainId,
          fileKey,
          metadataObject,
        })

        return metadataObject
      }

      const metadata = MetadataFiles.get(
        metadataKey({
          protocolId: this.protocolId,
          productId: this.product,
          chainId: this.chainId,
          fileKey,
        }),
      )

      if (!metadata) {
        logger.error(
          {
            protocolId: this.protocolId,
            productId: this.product,
            chainId: this.chainId,
            fileKey,
          },
          'Metadata file not found',
        )
        throw new Error('Metadata file not found')
      }

      logger.debug(
        {
          protocolId: this.protocolId,
          productId: this.product,
          chainId: this.chainId,
          fileKey,
        },
        'Metadata file loaded',
      )

      return metadata
    }

    return replacementMethod
  }
}

async function writeMetadataToFile({
  protocolId,
  productId,
  chainId,
  fileKey,
  metadataObject,
}: {
  protocolId: Protocol
  productId: string
  chainId: Chain
  fileKey: string
  metadataObject: Json
}) {
  const newFilePath = path.resolve(
    `src/adapters/${protocolId}/products/${productId}/metadata/${ChainName[chainId]}.${fileKey}.json`,
  )

  await fs.mkdir(path.dirname(newFilePath), { recursive: true })

  await fs.writeFile(
    newFilePath,
    JSON.stringify(metadataObject, null, 2),
    'utf-8',
  )

  postProcess({ protocolId, productId, chainId, fileKey })
}

async function postProcess({
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
