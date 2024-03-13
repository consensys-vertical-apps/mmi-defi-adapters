import { promises as fs } from 'fs'
import * as path from 'path'
import chalk from 'chalk'
import { Command } from 'commander'
import { prompt, QuestionCollection } from 'inquirer'
import partition from 'lodash/partition'
import { parse, print, types, visit } from 'recast'
import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import {
  isKebabCase,
  isPascalCase,
  kebabCase,
  lowerFirst,
  pascalCase,
} from '../core/utils/caseConversion'
import { filterMapSync } from '../core/utils/filters'
import { logger } from '../core/utils/logger'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import { DefiProvider } from '../defiProvider'
import { chainFilter, protocolFilter } from './commandFilters'
import { compoundV2BorrowMarketForkAdapterTemplate } from './templates/compoundV2BorrowMarketForkAdapter'
import { compoundV2SupplyMarketForkAdapterTemplate } from './templates/compoundV2SupplyMarketForkAdapter'
import { defaultAdapterTemplate } from './templates/defaultAdapter'
import { lpStakingAdapterTemplate } from './templates/lpStakingProtocolAdapter'
import { simplePoolAdapterTemplate } from './templates/simplePoolAdapter'
import { testCases } from './templates/testCases'
import { uniswapV2PoolForkAdapterTemplate } from './templates/uniswapV2PoolForkAdapter'
import n = types.namedTypes
import b = types.builders

type TemplateBuilder = (adapterSettings: NewAdapterAnswers) => string

export type NewAdapterAnswers = {
  protocolKey: string
  protocolId: string
  productId: string
  adapterClassName: string
  templateBuilder: TemplateBuilder
  chainKeys: (keyof typeof Chain)[]
}

const Templates: Record<string, TemplateBuilder> = {
  ['DefaultAdapter']: defaultAdapterTemplate,
  ['SimplePoolAdapter']: simplePoolAdapterTemplate,
  ['UniswapV2PoolForkAdapter']: uniswapV2PoolForkAdapterTemplate,
  ['LpStakingAdapter']: lpStakingAdapterTemplate,
  ['CompoundV2SupplyMarketForkAdapter']:
    compoundV2SupplyMarketForkAdapterTemplate,
  ['CompoundV2BorrowMarketForkAdapter']:
    compoundV2BorrowMarketForkAdapterTemplate,
}

export function newAdapterCommand(
  program: Command,
  defiProvider: DefiProvider,
) {
  program
    .command('new-adapter')
    .option('-p, --protocol <protocol>', 'Protocol name for the adapter')
    .option('-pd, --product <product>', 'Product name')
    .option('-t, --template <template>', 'Template to use')
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option('-y, --yes', 'Skip prompts and use default values')
    .showHelpAfterError()
    .action(
      async ({
        protocol,
        product,
        template,
        chains,
        yes: skipQuestions,
      }: {
        protocol: string
        product: string
        template: string
        chains: string
        yes: boolean
      }) => {
        const chainKeys = filterMapSync(
          chains?.split(',') ?? [],
          (filterInput) => {
            try {
              const chainId = chainFilter(filterInput)
              return Object.keys(Chain).find((chainKey) => {
                return Chain[chainKey as keyof typeof Chain] === chainId
              })
            } catch (e) {
              return undefined
            }
          },
        ) as (keyof typeof Chain)[]

        const inputProtocolId = (() => {
          try {
            return protocolFilter(protocol)
          } catch (e) {
            return undefined
          }
        })()

        const inputProtocolKey = inputProtocolId
          ? Object.entries(Protocol).find(
              ([_, value]) => value === inputProtocolId,
            )![0]
          : undefined

        const questions: QuestionCollection = [
          {
            type: 'input',
            name: 'protocolKey',
            message:
              'What PascalCase name should be used as this protocol key?',
            default: protocol ? pascalCase(protocol) : undefined,
            validate: (input: string) =>
              isPascalCase(input) || 'Value must be PascalCase',
            when: !inputProtocolId,
          },
          {
            type: 'input',
            name: 'protocolId',
            message:
              'What kebab-case name should be used for this protocol folder?',
            default: ({ protocolKey }: { protocolKey: string }) =>
              kebabCase(protocol ? protocol : protocolKey),
            validate: (input: string) =>
              isKebabCase(input) || 'Value must be kebab-case',
            when: !inputProtocolId,
          },
          {
            type: 'checkbox',
            name: 'chainKeys',
            message: 'What chains will the adapter be valid for?',
            choices: Object.keys(Chain),
            default: chainKeys.length ? chainKeys : ['Ethereum'],
          },
          {
            type: 'input',
            name: 'productId',
            message:
              'What kebab-case name should be used for this adapter product?',
            default: product ? kebabCase(product) : undefined,
            validate: (
              input: string,
              { chainKeys }: { chainKeys: (keyof typeof Chain)[] },
            ) => {
              if (!isKebabCase(input)) {
                return 'Value must be kebab-case'
              }

              if (!inputProtocolId) {
                return true
              }

              // Check if that productId already exists for that protocol
              const productExists = chainKeys.some((chainKey) => {
                const chainId = Chain[chainKey]

                try {
                  return defiProvider.adaptersController.fetchAdapter(
                    chainId,
                    inputProtocolId,
                    input,
                  )
                } catch (_) {
                  return false
                }
              })

              if (productExists) {
                return 'ProductId already exists for that Protocol and one of the chains selected'
              }

              return true
            },
          },
          {
            type: 'list',
            name: 'templateBuilder',
            message: 'What template should be used for the adapter class?',
            choices: Object.keys(Templates),
            default: template ? template : undefined,
            filter: (input: string) => Templates[input],
          },
          {
            type: 'input',
            name: 'adapterClassName',
            message:
              'What PascalCase name should be used for the adapter class?',
            default: ({
              protocolKey,
              productId,
            }: {
              protocolKey: string
              productId: string
            }) =>
              `${inputProtocolKey ?? protocolKey}${pascalCase(
                productId,
              )}Adapter`,
            validate: async (
              input: string,
              {
                protocolId,
                productId,
              }: { protocolId: string; productId: string },
            ) => {
              if (!isPascalCase(input)) {
                return 'Value must be PascalCase'
              }

              if (!input.endsWith('Adapter')) {
                return 'The adapter class should end up with the word Adapter'
              }

              if (
                await adapterFileExists(
                  inputProtocolId ?? protocolId,
                  productId,
                  input,
                )
              ) {
                return 'An adapter with that name already exists'
              }

              return true
            },
          },
        ]

        const initialAnswers: Partial<NewAdapterAnswers> = skipQuestions
          ? {
              protocolKey: inputProtocolKey ?? pascalCase(protocol),
              protocolId:
                inputProtocolId ??
                (isKebabCase(protocol) ? protocol : kebabCase(protocol)),
              chainKeys: chainKeys.length ? chainKeys : ['Ethereum'],
              productId: kebabCase(product),
              templateBuilder: Templates[template],
              adapterClassName: `${
                inputProtocolKey ?? pascalCase(protocol)
              }${pascalCase(product)}Adapter`,
            }
          : {
              protocolKey: inputProtocolKey,
              protocolId: inputProtocolId,
            }

        const answers = await prompt<NewAdapterAnswers>(
          questions,
          initialAnswers,
        )

        logger.debug(answers, 'Create new adapter')

        await buildAdapterFromTemplate(answers)
        await buildIntegrationTests(answers)
        await addProtocol(answers)
        await exportAdapter(answers)

        console.log(
          chalk`\n{bold New adapter created at: {bgBlack.red src/adapters/${
            answers.protocolId
          }/products/${answers.productId}/${lowerFirst(
            answers.adapterClassName,
          )}.ts}}\n`,
        )
      },
    )
}

/**
 * @description Creates a new adapter using the template
 */
async function buildAdapterFromTemplate(adapterSettings: NewAdapterAnswers) {
  const { protocolId, productId, adapterClassName, templateBuilder } =
    adapterSettings

  const adapterFilePath = buildAdapterFilePath(
    protocolId,
    productId,
    adapterClassName,
  )

  await writeCodeFile(adapterFilePath, templateBuilder(adapterSettings))
}

/**
 * @description Creates a new file for integration tests if it doesn't exist
 */
async function buildIntegrationTests({
  protocolId,
  protocolKey,
}: NewAdapterAnswers) {
  const testCasesFilePath = `./src/adapters/${protocolId}/tests/testCases.ts`

  if (await fileExists(testCasesFilePath)) {
    return
  }

  await writeCodeFile(testCasesFilePath, testCases())

  const testsFile = path.resolve('./src/adapters/integration.test.ts')
  const contents = await fs.readFile(testsFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitProgram(path) {
      const programNode = path.value as n.Program

      addTestCasesImport(programNode, protocolId, protocolKey)

      this.traverse(path)
    },
    visitFunctionDeclaration(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'runAllTests') {
        const runProtocolTestsNode = b.expressionStatement(
          b.callExpression(b.identifier('runProtocolTests'), [
            b.memberExpression(
              b.identifier('Protocol'),
              b.identifier(protocolKey),
            ),
            b.identifier(`${lowerFirst(protocolKey)}TestCases`),
          ]),
        )

        node.body.body = [...node.body.body, runProtocolTestsNode]
      }

      this.traverse(path)
    },
  })

  await writeCodeFile(testsFile, print(ast).code)
}

/**
 * @description Adds a new entry to the imports for the test cases
 *
 * @param programNode AST node for the Protocol program
 */
function addTestCasesImport(
  programNode: n.Program,
  protocolId: string,
  protocolKey: string,
) {
  const [importNodes, codeAfterImports] = partition(programNode.body, (node) =>
    n.ImportDeclaration.check(node),
  )

  const newImportEntry = buildImportTestCasesEntry(protocolId, protocolKey)

  programNode.body = [...importNodes, newImportEntry, ...codeAfterImports]
}

/*
import { testCases as <protocolId>TestCases } from './<protocolId>/tests/testCases'
*/
function buildImportTestCasesEntry(protocolId: string, protocolKey: string) {
  return b.importDeclaration(
    [
      b.importSpecifier(
        b.identifier('testCases'),
        b.identifier(`${lowerFirst(protocolKey)}TestCases`),
      ),
    ],
    b.literal(`./${protocolId}/tests/testCases`),
  )
}

/**
 * @description Writes changes to include new adapter in src/adapters/protocols.ts file
 */
async function addProtocol({ protocolKey, protocolId }: NewAdapterAnswers) {
  const protocolsFile = path.resolve('./src/adapters/protocols.ts')
  const contents = await fs.readFile(protocolsFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'Protocol') {
        addProtocolEntry(node, protocolKey, protocolId)
      }

      this.traverse(path)
    },
  })

  await writeCodeFile(protocolsFile, print(ast).code)
}

/**
 * @description Writes changes to include new adapter in src/adapters/index.ts file
 */
async function exportAdapter({
  protocolKey,
  protocolId,
  productId,
  adapterClassName,
  chainKeys,
}: NewAdapterAnswers) {
  const adaptersFile = path.resolve('./src/adapters/index.ts')
  const contents = await fs.readFile(adaptersFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitProgram(path) {
      const programNode = path.value as n.Program

      addAdapterImport(programNode, protocolId, productId, adapterClassName)

      this.traverse(path)
    },
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'supportedProtocols') {
        addAdapterEntries(node, protocolKey, adapterClassName, chainKeys)
      }

      this.traverse(path)
    },
  })

  await writeCodeFile(adaptersFile, print(ast).code)
}

/**
 * @description Adds a new entry to the imports for the new adapter
 *
 * @param programNode AST node for the Protocol program
 */
function addAdapterImport(
  programNode: n.Program,
  protocolId: string,
  productId: string,
  adapterClassName: string,
) {
  const [importNodes, codeAfterImports] = partition(programNode.body, (node) =>
    n.ImportDeclaration.check(node),
  )

  const newImportEntry = buildImportAdapterEntry(
    protocolId,
    productId,
    adapterClassName,
  )

  programNode.body = [...importNodes, newImportEntry, ...codeAfterImports]
}

/**
 * @description Adds a new entry to the Protocol constant if it does not exist.
 *
 * @param protocolListDeclaratorNode AST node for the Protocol declarator
 */
function addProtocolEntry(
  protocolListDeclaratorNode: n.VariableDeclarator,
  protocolKey: string,
  protocolId: string,
) {
  const protocolListObjectNode = protocolListDeclaratorNode.init
  if (
    !n.TSAsExpression.check(protocolListObjectNode) ||
    !n.ObjectExpression.check(protocolListObjectNode.expression)
  ) {
    throw new Error('Incorrectly typed Protocol object')
  }

  const protocolEntryObjectNode =
    protocolListObjectNode.expression.properties.find((property) => {
      if (
        !n.ObjectProperty.check(property) ||
        !n.Identifier.check(property.key)
      ) {
        throw new Error('Incorrectly typed Protocol object')
      }

      return property.key.name === protocolKey
    })

  if (!protocolEntryObjectNode) {
    protocolListObjectNode.expression.properties.push(
      buildProtocolEntry(protocolKey, protocolId),
    )
  }
}

/**
 * @description Adds chain entries for the adapter to the supportedProtocols constant
 *
 * @param supportedProtocolsDeclaratorNode AST node for the supportedProtocols declarator
 */
function addAdapterEntries(
  supportedProtocolsDeclaratorNode: n.VariableDeclarator,
  protocolKey: string,
  adapterClassName: string,
  chainKeys: (keyof typeof Chain)[],
) {
  const supportedProtocolsObjectNode = supportedProtocolsDeclaratorNode.init
  if (!n.ObjectExpression.check(supportedProtocolsObjectNode)) {
    throw new Error('Incorrectly typed supportedProtocols object')
  }

  let protocolChainsObjectPropertyNode =
    supportedProtocolsObjectNode.properties.find((property) => {
      if (
        !n.ObjectProperty.check(property) ||
        !n.MemberExpression.check(property.key) ||
        !n.Identifier.check(property.key.property)
      ) {
        throw new Error('Incorrectly typed supportedProtocols object')
      }

      return property.key.property.name === protocolKey
    }) as n.ObjectProperty

  if (!protocolChainsObjectPropertyNode) {
    protocolChainsObjectPropertyNode = buildSupportedProtocolEntry(protocolKey)

    supportedProtocolsObjectNode.properties.push(
      protocolChainsObjectPropertyNode,
    )
  }

  const protocolChainEntries = protocolChainsObjectPropertyNode.value
  if (!n.ObjectExpression.check(protocolChainEntries)) {
    throw new Error('Incorrectly typed supportedProtocols object')
  }

  for (const chainKey of chainKeys) {
    let protocolChainEntryNode = protocolChainEntries.properties.find(
      (property) => {
        if (
          !n.ObjectProperty.check(property) ||
          !n.MemberExpression.check(property.key) ||
          !n.Identifier.check(property.key.property)
        ) {
          throw new Error('Incorrectly typed supportedProtocols object')
        }

        return property.key.property.name === chainKey
      },
    ) as n.ObjectProperty

    if (!protocolChainEntryNode) {
      protocolChainEntryNode = buildChainEntry(chainKey)

      protocolChainEntries.properties.push(protocolChainEntryNode)
    }

    if (!n.ArrayExpression.check(protocolChainEntryNode.value)) {
      throw new Error('Incorrectly typed supportedProtocols object')
    }

    const newAdapterEntry = buildAdapterEntry(adapterClassName)
    protocolChainEntryNode.value.elements.push(newAdapterEntry)
  }
}

/*
<ProtocolKey>: 'protocol-id'
*/
function buildProtocolEntry(protocolKey: string, protocolId: string) {
  const key = b.identifier(protocolKey)
  const value = b.stringLiteral(protocolId)

  return b.objectProperty(key, value)
}

/*
import { <AdapterClassName> } from './<protocol-id>/products/<product-id>/<adapterClassName>'
*/
function buildImportAdapterEntry(
  protocolId: string,
  productId: string,
  adapterClassName: string,
) {
  return b.importDeclaration(
    [b.importSpecifier(b.identifier(adapterClassName))],
    b.literal(
      `./${protocolId}/products/${productId}/${lowerFirst(adapterClassName)}`,
    ),
  )
}

/*
[Protocol.<ProtocolKey>]: {}
*/
function buildSupportedProtocolEntry(protocolKey: string) {
  const key = b.memberExpression(
    b.identifier('Protocol'),
    b.identifier(protocolKey),
  )
  const value = b.objectExpression([])

  const newEntry = b.objectProperty(key, value)
  newEntry.computed = true

  return newEntry
}

/*
[Chain.<ChainKey>]: [],
*/
function buildChainEntry(chainKey: keyof typeof Chain) {
  const key = b.memberExpression(b.identifier('Chain'), b.identifier(chainKey))
  const value = b.arrayExpression([])

  const newEntry = b.objectProperty(key, value)
  newEntry.computed = true

  return newEntry
}

/*
<AdapterClassName>
*/
function buildAdapterEntry(adapterClassName: string) {
  return b.identifier(`${adapterClassName}`)
}

function buildAdapterFilePath(
  protocolId: string,
  productId: string,
  adapterClassName: string,
): string {
  const productPath = path.resolve(
    `./src/adapters/${protocolId}/products/${productId}`,
  )

  return path.resolve(productPath, `${lowerFirst(adapterClassName)}.ts`)
}

async function adapterFileExists(
  protocolId: string,
  productId: string,
  adapterClassName: string,
): Promise<boolean> {
  const adapterFilePath = buildAdapterFilePath(
    protocolId,
    productId,
    adapterClassName,
  )

  return fileExists(adapterFilePath)
}

async function fileExists(filePath: string) {
  return fs
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}
