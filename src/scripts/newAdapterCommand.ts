import { Command } from 'commander'
import { promises as fs } from 'fs'
import * as path from 'path'
import { parse, visit, types, print } from 'recast'
import { adapterTemplate } from './templates/adapter'
import { camelCase, kebabCase, pascalCase } from '../core/utils/caseConversion'
import { partition } from 'lodash'

import n = types.namedTypes
import b = types.builders
import { writeCodeFile } from './writeCodeFile'

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
    .action(async (protocol: string, product: string, chains: string) => {
      // TODO: Validate that chains exist
      await buildAdapterFromTemplate(protocol, product)
      await exportAdapter(protocol, product, chains.split(','))
    })
}

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

async function exportAdapter(
  protocol: string,
  product: string,
  chains: string[],
) {
  const adaptersFile = path.resolve('./src/adapters/index.ts')
  const contents = await fs.readFile(adaptersFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitProgram(path) {
      const programNode = path.value as n.Program

      const [importNodes, codeAfterImports] = partition(
        programNode.body,
        (node) => n.ImportDeclaration.check(node),
      )

      const newImportEntry = buildImportEntry(protocol, product)

      programNode.body = [...importNodes, newImportEntry, ...codeAfterImports]

      this.traverse(path)
    },
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
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

function addAdapterEntries(
  supportedProtocolsDeclaratorNode: n.VariableDeclarator,
  protocol: string,
  product: string,
  chains: string[],
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

  const newEntries = chains.map((chain) => {
    const newAdapterEntry = buildAdapterEntry(chain, product)
    const newChainEntry = buildChainEntry(chain, [newAdapterEntry])

    return newChainEntry
  })

  protocolChainEntries.properties = [
    ...protocolChainEntries.properties,
    ...newEntries,
  ]
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
[Chain.<ChainName>]: [...adapterEntries],
*/
function buildChainEntry(
  chain: string,
  adapterEntries: n.ArrowFunctionExpression[],
) {
  const key = b.memberExpression(
    b.identifier('Chain'),
    b.identifier(pascalCase(chain)),
  )
  const value = b.arrayExpression(adapterEntries)

  const newEntry = b.objectProperty(key, value)
  newEntry.computed = true

  return newEntry as n.ObjectProperty & {
    value: n.ArrayExpression
  }
}

/*
(provider) =>
  new <ProductName>Adapter({
    metadata: {},
    chainId: Chain.<ChainName>,
    provider: provider,
  }),
*/
function buildAdapterEntry(chain: string, product: string) {
  const params = [b.identifier('provider')]
  const body = b.newExpression(b.identifier(`${pascalCase(product)}Adapter`), [
    b.objectExpression([
      b.objectProperty(b.identifier('metadata'), b.objectExpression([])),
      b.objectProperty(
        b.identifier('chainId'),
        b.memberExpression(
          b.identifier('Chain'),
          b.identifier(pascalCase(chain)),
        ),
      ),
      b.objectProperty(b.identifier('provider'), b.identifier('provider')),
    ]),
  ])

  return b.arrowFunctionExpression(params, body)
}
