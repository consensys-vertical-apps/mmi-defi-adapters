import fs from 'fs'
import path from 'path'
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

  let writeActionInputs: any[] = []

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
        const fullProductName = `${protocolKey}${pascalCase(productId)}`
        const productAdapterPath = `./${protocolId}/products/${productId}/${lowerFirst(
          `${fullProductName}`,
        )}Adapter`

        writeActionInputs.push({
          protocolKey,
          protocolId,
          productId,
          writeActionInputs: Object.keys(WriteActionInputs),
          fullProductName,
          productAdapterPath,
        })
      }
    }
  }

  await addImportsAndSchemas(writeActionInputs)
}

async function addImportsAndSchemas(
  productsInputs: {
    protocolKey: string
    protocolId: string
    productId: string
    writeActionInputs: string[]
    fullProductName: string
    productAdapterPath: string
  }[],
) {
  const adaptersFile = path.resolve('./src/adapters/supportedProtocols.ts')
  const contents = fs.readFileSync(adaptersFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitImportDeclaration(path) {
      const node = path.node
      const productInputs = productsInputs.find(
        ({ productAdapterPath }) => node.source.value === productAdapterPath,
      )
      if (productInputs) {
        const importName = 'WriteActionInputs'
        if (
          !node.specifiers!.some(
            (specifier) =>
              n.ImportSpecifier.check(specifier) &&
              specifier.imported.name === importName,
          )
        ) {
          node.specifiers!.push(
            b.importSpecifier(
              b.identifier(importName),
              b.identifier(`${productInputs.fullProductName}${importName}`),
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

      if (
        node.id.name === 'WriteActionInputs' &&
        n.ObjectExpression.check(node.init) &&
        node.init.properties.every(
          (property) =>
            n.ObjectProperty.check(property) &&
            n.Identifier.check(property.key),
        )
      ) {
        productsInputs.forEach(({ fullProductName }) => {
          if (
            !n.ObjectExpression.check(node.init) ||
            node.init.properties.some(
              (property) =>
                n.ObjectProperty.check(property) &&
                n.Identifier.check(property.key) &&
                property.key.name === `${fullProductName}WriteActionInputs`,
            )
          ) {
            return false
          }

          const objectProperty = b.objectProperty(
            b.identifier(`${fullProductName}${(node.id as n.Identifier).name}`),
            b.identifier(`${fullProductName}${(node.id as n.Identifier).name}`),
          )
          objectProperty.shorthand = true
          node.init.properties.push(objectProperty)
        })

        sortEntries(
          node.init.properties,
          (entry) => ((entry as n.ObjectProperty).key as n.Identifier).name,
        )
      }
      this.traverse(path)
    },
    visitExportNamedDeclaration(path) {
      if (
        n.VariableDeclaration.check(path.node.declaration) &&
        path.node.declaration.declarations.length === 1 &&
        n.VariableDeclarator.check(path.node.declaration.declarations[0]) &&
        n.Identifier.check(path.node.declaration.declarations[0].id) &&
        ['WriteActionInputs', 'GetTransactionParamsSchema'].includes(
          path.node.declaration.declarations[0].id.name,
        )
      ) {
        path.prune()
      }

      if (
        n.TSTypeAliasDeclaration.check(path.node.declaration) &&
        path.node.declaration.id.name === 'GetTransactionParams'
      ) {
        path.prune()
      }

      this.traverse(path)
    },
  })

  const writeActionInputsExportStatement = `
  export const WriteActionInputs = {
    ${productsInputs
      .map(({ fullProductName }) => `${fullProductName}WriteActionInputs`)
      .join(',')}
  }
  `

  const schemas = productsInputs.map(
    ({ protocolKey, productId, writeActionInputs }) => {
      const actionSchemas = writeActionInputs.map((action) => {
        return `
        z.object({
          protocolId: z.literal(Protocol.${protocolKey}),
          productId: z.literal('${productId}'),
          chainId: z.nativeEnum(Chain),
          action: z.literal('${action}'),
          inputs:
            WriteActionInputs['${protocolKey}${pascalCase(
              productId,
            )}WriteActionInputs']['${action}'],
        })`
      })
      return `z.discriminatedUnion('action', [${actionSchemas.join(',')}])`
    },
  )

  const schemaExportStatement = `export const GetTransactionParamsSchema = z.union([${schemas.join(
    ',',
  )}])
  `

  const schemaTypeExportStatement = `export type GetTransactionParams = z.infer<typeof GetTransactionParamsSchema>;`

  await writeCodeFile(
    adaptersFile,
    print(ast).code +
      writeActionInputsExportStatement +
      schemaExportStatement +
      schemaTypeExportStatement,
  )
}
