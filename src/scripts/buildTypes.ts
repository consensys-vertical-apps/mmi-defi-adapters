import fs from 'fs'
import * as path from 'path'
import { Command } from 'commander'
import { parse, print, types, visit } from 'recast'
import { glob, runTypeChain } from 'typechain'
import { Protocol } from '../adapters/protocols'
import { lowerFirst, pascalCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import { DefiProvider } from '../defiProvider'
import { sortEntries } from './utils/sortEntries'
import n = types.namedTypes
import b = types.builders

export function buildContractTypes(program: Command) {
  program
    .command('build-types')
    .showHelpAfterError()
    .action(async () => {
      await buildGlobalContractTypes()
      await builAdapterContracts()
      await buildSchemas()
    })
}

async function buildGlobalContractTypes() {
  const contractsDirectory = path.resolve('src/contracts')
  await buildContractTypesForFolder(contractsDirectory)
}

async function builAdapterContracts() {
  const adaptersFolderPath = path.resolve('src/adapters')
  const adaptersFolderEntries = fs.readdirSync(adaptersFolderPath, {
    withFileTypes: true,
  })

  for (const adapterFolderEntry of adaptersFolderEntries) {
    if (!adapterFolderEntry.isDirectory()) {
      continue
    }

    const abisFolder = path.join(
      adaptersFolderPath,
      adapterFolderEntry.name,
      'contracts/abis',
    )
    if (
      !fs.existsSync(abisFolder) ||
      !fs
        .readdirSync(abisFolder, { withFileTypes: true })
        .some((entry) => entry.name.endsWith('.json'))
    ) {
      continue
    }

    await buildContractTypesForFolder(path.resolve(abisFolder, '..'))
  }
}

async function buildContractTypesForFolder(contractsDirectory: string) {
  const allFiles = glob(contractsDirectory, ['**/*.json'])

  const result = await runTypeChain({
    cwd: process.cwd(),
    filesToProcess: allFiles,
    allFiles,
    outDir: contractsDirectory,
    target: 'ethers-v6',
  })

  logger.debug(
    { contractsDirectory, allFiles, result },
    'Generated types for contracts',
  )
}

async function buildSchemas() {
  const defiProvider = new DefiProvider()
  const support = defiProvider.getSupport()

  for (const [protocolId, protocolAdapters] of Object.entries(support)) {
    const protocolKey = Object.keys(Protocol).find(
      (protocolKey) =>
        Protocol[protocolKey as keyof typeof Protocol] === protocolId,
    ) as keyof typeof Protocol

    for (const adapterSupport of protocolAdapters) {
      const productId = adapterSupport.protocolDetails.productId
      const adapterFilePath = path.resolve(
        `./lib/main/adapters/${protocolId}/products/${productId}/${lowerFirst(
          protocolKey,
        )}${pascalCase(productId)}Adapter`,
      )

      const { WriteActionInputs } = await import(adapterFilePath)

      if (WriteActionInputs) {
        await addWriteActionInputs({
          protocolKey,
          protocolId,
          productId,
        })
      }
    }
  }
}

async function addWriteActionInputs({
  protocolKey,
  protocolId,
  productId,
}: {
  protocolKey: string
  protocolId: string
  productId: string
}) {
  const adaptersFile = path.resolve('./src/adapters/index.ts')
  const contents = fs.readFileSync(adaptersFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitImportDeclaration(path) {
      const node = path.node
      if (
        node.source.value ===
          `./${protocolId}/products/${productId}/${lowerFirst(
            protocolKey,
          )}${pascalCase(productId)}Adapter` &&
        node.source.value.toLowerCase().includes('aave')
      ) {
        if (
          !node.specifiers!.some(
            (specifier) =>
              (specifier as n.ImportSpecifier).imported.name ===
              'GetTxParamsInput',
          )
        ) {
          node.specifiers!.push(
            b.importSpecifier(
              b.identifier('GetTxParamsInput'),
              b.identifier(
                `${protocolKey}${pascalCase(productId)}GetTxParamsInput`,
              ),
            ),
          )
        }

        if (
          !node.specifiers!.some(
            (specifier) =>
              (specifier as n.ImportSpecifier).imported.name ===
              'WriteActionInputs',
          )
        ) {
          node.specifiers!.push(
            b.importSpecifier(
              b.identifier('WriteActionInputs'),
              b.identifier(
                `${protocolKey}${pascalCase(productId)}WriteActionInputs`,
              ),
            ),
          )
        }
      }
      this.traverse(path)
    },
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'WriteActionInputs') {
        if (
          !n.ObjectExpression.check(node.init) ||
          node.init.properties.some(
            (property) =>
              n.ObjectProperty.check(property) &&
              n.Identifier.check(property.key) &&
              property.key.name ===
                `${protocolKey}${pascalCase(productId)}WriteActionInputs`,
          )
        ) {
          return false
        }

        const objectProperty = b.objectProperty(
          b.identifier(
            `${protocolKey}${pascalCase(productId)}WriteActionInputs`,
          ),
          b.identifier(
            `${protocolKey}${pascalCase(productId)}WriteActionInputs`,
          ),
        )
        objectProperty.shorthand = true
        node.init.properties.push(objectProperty)
        sortEntries(
          node.init.properties,
          (entry) => ((entry as n.ObjectProperty).key as n.Identifier).name,
        )
      } else if (node.id.name === 'GetTransactionParamsInputSchema') {
        if (
          !n.CallExpression.check(node.init) ||
          !n.ArrayExpression.check(node.init.arguments[0]) ||
          node.init.arguments[0].elements.some(
            (element) =>
              n.Identifier.check(element) &&
              element.name ===
                `${protocolKey}${pascalCase(productId)}GetTxParamsInput`,
          )
        ) {
          return false
        }

        node.init.arguments[0].elements.push(
          b.identifier(
            `${protocolKey}${pascalCase(productId)}GetTxParamsInput`,
          ),
        )
        sortEntries(
          node.init.arguments[0].elements,
          (entry) => (entry as n.Identifier).name,
        )
      }
      this.traverse(path)
    },
  })

  await writeCodeFile(adaptersFile, print(ast).code)
}
