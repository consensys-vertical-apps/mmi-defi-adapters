import { promises as fs } from 'fs'
import * as path from 'path'
import { Command } from 'commander'
import partition from 'lodash/partition'
import { parse, visit, types, print } from 'recast'
import { Chain } from '../core/constants/chains'
import { camelCase, kebabCase, pascalCase } from '../core/utils/caseConversion'
import { filterMap } from '../core/utils/filters'
import { adapterTemplate } from './templates/adapter'
import { writeCodeFile } from './writeCodeFile'
import n = types.namedTypes
import b = types.builders

export function newAdapterCommand(program: Command) {
  program
    .command('new-adapter')
    .argument('<protocol>', 'Protocol name')
    .argument('<product>', 'Product name (kebab-case)')
    .argument(
      '[chains]',
      'Chain separated by commas (e.g. Ethereum,Arbitrum,Optimism)',
      'Ethereum',
    )
    .showHelpAfterError()
    .action(async (protocol: string, product: string, chainsInput: string) => {
      const chains = filterMap(chainsInput.split(','), (chainInput) => {
        const chain = Object.keys(Chain).find((chainKey) => {
          return chainKey.toLowerCase() === chainInput.toLowerCase()
        })

        if (!chain) {
          console.warn(`Cannot find corresponding chain for ${chainInput}`)
        }

        return chain
      }) as (keyof typeof Chain)[]

      await buildAdapterFromTemplate(protocol, product)
      await exportAdapter(protocol, product, chains)
    })
}

/**
 * @description Creates a new adapter using the template
 *
 * @param protocol Name of the protocol
 * @param product Name of the product
 */
async function buildAdapterFromTemplate(protocol: string, product: string) {
  const productPath = path.resolve(
    `./src/adapters/${kebabCase(protocol)}/products/${kebabCase(product)}`,
  )

  await fs.mkdir(productPath, { recursive: true })

  const adapterFilePath = path.resolve(
    productPath,
    `${camelCase(product)}Adapter.ts`,
  )

  const fileExists = await fs
    .access(adapterFilePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)

  if (fileExists) {
    // TODO Find or ask for a new name instead of throwing
    throw new Error('An adapter for that product already exists')
  }

  writeCodeFile(adapterFilePath, adapterTemplate(protocol, product))
}

/**
 * @description Writes changes to include new adapter in src/adapters/index.ts file
 *
 * @param protocol Name of the protocol
 * @param product Name of the product
 * @param chains List of chain names
 */
async function exportAdapter(
  protocol: string,
  product: string,
  chains: (keyof typeof Chain)[],
) {
  const adaptersFile = path.resolve('./src/adapters/index.ts')
  const contents = await fs.readFile(adaptersFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitProgram(path) {
      const programNode = path.value as n.Program

      addImport(programNode, protocol, product)

      this.traverse(path)
    },
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'supportedProtocols') {
        addAdapterEntries(node, protocol, product, chains)
      } else if (node.id.name === 'Protocol') {
        addProtocol(node, protocol)
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
 * @param protocol Name of the protocol
 * @param product Name of the product
 */
function addImport(programNode: n.Program, protocol: string, product: string) {
  const [importNodes, codeAfterImports] = partition(programNode.body, (node) =>
    n.ImportDeclaration.check(node),
  )

  const newImportEntry = buildImportEntry(protocol, product)

  programNode.body = [...importNodes, newImportEntry, ...codeAfterImports]
}

/**
 * @description Adds a new entry to the Protocol constant if it does not exist.
 *
 * @param protocolListDeclaratorNode AST node for the Protocol declarator
 * @param protocol Name of the protocol
 */
function addProtocol(
  protocolListDeclaratorNode: n.VariableDeclarator,
  protocol: string,
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

      return property.key.name === pascalCase(protocol)
    })

  if (!protocolEntryObjectNode) {
    protocolListObjectNode.expression.properties.push(
      buildProtocolEntry(protocol),
    )
  }
}

/**
 * @description Adds chain entries for the adapter to the supportedProtocols constant
 *
 * @param supportedProtocolsDeclaratorNode AST node for the supportedProtocols declarator
 * @param protocol Name of the protocol
 * @param product Name of the product
 * @param chains List of chain names
 */
function addAdapterEntries(
  supportedProtocolsDeclaratorNode: n.VariableDeclarator,
  protocol: string,
  product: string,
  chains: (keyof typeof Chain)[],
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

      return property.key.property.name === pascalCase(protocol)
    }) as n.ObjectProperty

  if (!protocolChainsObjectPropertyNode) {
    protocolChainsObjectPropertyNode = buildSupportedProtocolEntry(protocol)

    supportedProtocolsObjectNode.properties.push(
      protocolChainsObjectPropertyNode,
    )
  }

  const protocolChainEntries = protocolChainsObjectPropertyNode.value
  if (!n.ObjectExpression.check(protocolChainEntries)) {
    throw new Error('Incorrectly typed supportedProtocols object')
  }

  for (const chain of chains) {
    const newAdapterEntry = buildAdapterEntry(chain, product)

    let protocolChainEntryNode = protocolChainEntries.properties.find(
      (property) => {
        if (
          !n.ObjectProperty.check(property) ||
          !n.MemberExpression.check(property.key) ||
          !n.Identifier.check(property.key.property)
        ) {
          throw new Error('Incorrectly typed supportedProtocols object')
        }

        return property.key.property.name === pascalCase(chain)
      },
    ) as n.ObjectProperty

    if (!protocolChainEntryNode) {
      protocolChainEntryNode = buildChainEntry(chain)

      protocolChainEntries.properties.push(protocolChainEntryNode)
    }

    if (!n.ArrayExpression.check(protocolChainEntryNode.value)) {
      throw new Error('Incorrectly typed supportedProtocols object')
    }

    protocolChainEntryNode.value.elements.push(newAdapterEntry)
  }
}

/*
<ProtocolName>: 'protocol-name'
*/
function buildProtocolEntry(protocol: string) {
  const key = b.identifier(pascalCase(protocol))
  const value = b.stringLiteral(kebabCase(protocol))

  return b.objectProperty(key, value)
}

/*
import { <ProductName>Adapter } from './<protocol-name>/products/<product-name>/<productName>Adapter'
*/
function buildImportEntry(protocol: string, product: string) {
  return b.importDeclaration(
    [b.importSpecifier(b.identifier(`${pascalCase(product)}Adapter`))],
    b.literal(
      `./${kebabCase(protocol)}/products/${kebabCase(product)}/${camelCase(
        product,
      )}Adapter`,
    ),
  )
}

/*
[Protocol.<ProtocolName>]: {}
*/
function buildSupportedProtocolEntry(protocol: string) {
  const key = b.memberExpression(
    b.identifier('Protocol'),
    b.identifier(pascalCase(protocol)),
  )
  const value = b.objectExpression([])

  const newEntry = b.objectProperty(key, value)
  newEntry.computed = true

  return newEntry
}

/*
[Chain.<ChainName>]: [],
*/
function buildChainEntry(chain: string) {
  const key = b.memberExpression(
    b.identifier('Chain'),
    b.identifier(pascalCase(chain)),
  )
  const value = b.arrayExpression([])

  const newEntry = b.objectProperty(key, value)
  newEntry.computed = true

  return newEntry
}

/*
(provider) =>
  new <ProductName>Adapter({
    metadata: {},
    chainId: Chain.<ChainName>,
    provider,
  }),
*/
function buildAdapterEntry(chain: string, product: string) {
  const params = [b.identifier('provider')]

  const metadataProperty = b.objectProperty(
    b.identifier('metadata'),
    b.objectExpression([]),
  )

  const chainIdProperty = b.objectProperty(
    b.identifier('chainId'),
    b.memberExpression(b.identifier('Chain'), b.identifier(pascalCase(chain))),
  )

  const providerProperty = b.objectProperty(
    b.identifier('provider'),
    b.identifier('provider'),
  )
  providerProperty.shorthand = true

  const body = b.newExpression(b.identifier(`${pascalCase(product)}Adapter`), [
    b.objectExpression([metadataProperty, chainIdProperty, providerProperty]),
  ])

  return b.arrowFunctionExpression(params, body)
}
