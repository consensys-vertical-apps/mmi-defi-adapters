import { promises as fs } from 'fs'
import * as path from 'path'
import { Command } from 'commander'
import { prompt, QuestionCollection } from 'inquirer'
import partition from 'lodash/partition'
import { parse, print, types, visit } from 'recast'
import { Chain } from '../core/constants/chains'
import {
  isKebabCase,
  isPascalCase,
  kebabCase,
  lowerFirst,
  pascalCase,
} from '../core/utils/caseConversion'
import { filterMap } from '../core/utils/filters'
import { logger } from '../core/utils/logger'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import { chainFilter } from './commandFilters'
import { defaultAdapterTemplate } from './templates/defaultAdapter'
import { simplePoolAdapterTemplate } from './templates/simplePoolAdapter'
import n = types.namedTypes
import b = types.builders

type TemplateBuilder = (protocolName: string, adapterName: string) => string

type NewAdapterAnswers = {
  protocolKey: string
  protocolId: string
  productId: string
  adapterClassName: string
  templateBuilder: TemplateBuilder
  chainKeys: (keyof typeof Chain)[]
}

const Templates: Record<string, TemplateBuilder> = {
  ['DefaulAdapter']: defaultAdapterTemplate,
  ['SimplePoolAdapter']: simplePoolAdapterTemplate,
}

export function newAdapterCommand(program: Command) {
  program
    .command('new-adapter')
    .option('-p, --protocol <protocol>', 'Protocol name for the adapter')
    .option('-pd, --product <product>', 'Product name')
    .option('-t, --template <template>', 'Template to use', 'DefaulAdapter')
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
      'Ethereum',
    )
    .showHelpAfterError()
    .action(
      async ({
        protocol,
        product,
        template,
        chains,
      }: {
        protocol: string
        product: string
        template: string
        chains: string
      }) => {
        const chainKeys = filterMap(chains?.split(','), (filterInput) => {
          try {
            const chainId = chainFilter(filterInput)
            return Object.keys(Chain).find((chainKey) => {
              return Chain[chainKey as keyof typeof Chain] === chainId
            })
          } catch (e) {
            return undefined
          }
        }) as (keyof typeof Chain)[]

        const questions: QuestionCollection = [
          {
            type: 'input',
            name: 'protocolKey',
            message:
              'What PascalCase name should be used as this protocol key?',
            default: protocol ? pascalCase(protocol) : undefined,
            validate: (input: string) =>
              isPascalCase(input) || 'Value must be PascalCase',
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
          },
          {
            type: 'input',
            name: 'productId',
            message:
              'What kebab-case name should be used for this adapter product?',
            default: product ? kebabCase(product) : undefined,
            validate: (input: string) =>
              isKebabCase(input) || 'Value must be kebab-case',
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
            }) => `${protocolKey}${pascalCase(productId)}`,
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

              if (await adapterFileExists(protocolId, productId, input)) {
                return 'An adapter with that name already exists'
              }

              return true
            },
            filter: (input: string) => `${input}Adapter`,
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
            type: 'checkbox',
            name: 'chainKeys',
            message: 'What chains will the adapter be valid for?',
            choices: Object.keys(Chain),
            default: chainKeys,
          },
        ]

        const answers = await prompt<NewAdapterAnswers>(questions)

        logger.info(answers, 'Create new adapter')

        await buildAdapterFromTemplate(answers)
        await exportAdapter(answers)
      },
    )
}

/**
 * @description Creates a new adapter using the template
 *
 * @param protocol Name of the protocol
 * @param product Name of the product
 */
async function buildAdapterFromTemplate({
  protocolKey,
  protocolId,
  productId,
  adapterClassName,
  templateBuilder,
}: NewAdapterAnswers) {
  const adapterFilePath = buildAdapterFilePath(
    protocolId,
    productId,
    adapterClassName,
  )

  writeCodeFile(adapterFilePath, templateBuilder(protocolKey, adapterClassName))
}

/**
 * @description Writes changes to include new adapter in src/adapters/index.ts file
 *
 * @param protocol Name of the protocol
 * @param product Name of the product
 * @param chainKeys List of chain names
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

      addImport(programNode, protocolId, productId, adapterClassName)

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
      } else if (node.id.name === 'Protocol') {
        addProtocol(node, protocolKey, productId)
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
 * @param protocolKey Name of the protocol
 * @param productId Name of the product
 */
function addImport(
  programNode: n.Program,
  protocolId: string,
  productId: string,
  adapterClassName: string,
) {
  const [importNodes, codeAfterImports] = partition(programNode.body, (node) =>
    n.ImportDeclaration.check(node),
  )

  const newImportEntry = buildImportEntry(
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
 * @param productId Name of the protocol
 */
function addProtocol(
  protocolListDeclaratorNode: n.VariableDeclarator,
  protocolKey: string,
  productId: string,
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
      buildProtocolEntry(protocolKey, productId),
    )
  }
}

/**
 * @description Adds chain entries for the adapter to the supportedProtocols constant
 *
 * @param supportedProtocolsDeclaratorNode AST node for the supportedProtocols declarator
 * @param protocoKey Name of the protocol
 * @param adapterClassName Name of the product
 * @param chainKeys List of chain names
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
function buildImportEntry(
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

  return fs
    .access(adapterFilePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}
