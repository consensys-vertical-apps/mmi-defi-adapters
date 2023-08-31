import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { parse, visit, types, print } from 'recast'
import { adapterTemplate } from './templates/adapter'
import { camelCase, kebabCase, pascalCase } from '../core/utils/caseConversion'
import { partition } from 'lodash'

import n = types.namedTypes
import b = types.builders
import { writeCodeFile } from './writeCodeFile'

export function addNewAdapterCommand(program: Command) {
  program
    .command('new-adapter')
    .argument('<protocol>', 'Protocol id')
    .argument('<product>', 'Product name')
    .argument(
      '[chains]',
      'Chain separated by commas (e.g. Ethereum,Arbitrum,Optimism)',
      'Ethereum',
    )
    .showHelpAfterError()
    .action(async (protocol: string, product: string, chains: string) => {
      newAdapterTemplate(protocol, product)
      exportAdapter(protocol, product, chains.split(','))
    })
}

function newAdapterTemplate(protocol: string, product: string) {
  const protocolProductsPath = path.resolve(
    `./src/adapters/${kebabCase(protocol)}/products`,
  )

  if (!fs.existsSync(protocolProductsPath)) {
    // TODO Call method to create a protocol folder
    console.error(`Protocol folder does not exist: ${protocolProductsPath}`)
    return
  }

  const productPath = path.resolve(protocolProductsPath, kebabCase(product))

  if (!fs.existsSync(productPath)) {
    console.log(`create folder ${productPath}`)
    fs.mkdirSync(productPath)
  }

  const adapterFilePath = path.resolve(
    productPath,
    `${camelCase(product)}Adapter.ts`,
  )

  writeCodeFile(adapterFilePath, adapterTemplate(protocol, product))
}

function exportAdapter(protocol: string, product: string, chains: string[]) {
  // TODO Add new adapter to list in src/adapters/index.ts
  const contents = fs.readFileSync('./src/adapters/index.ts', 'utf-8')
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
      const supportedProtocolsDeclarationNode = path.node
      if (
        !n.Identifier.check(supportedProtocolsDeclarationNode.id) ||
        supportedProtocolsDeclarationNode.id.name !== 'supportedProtocols' ||
        !n.ObjectExpression.assert(supportedProtocolsDeclarationNode.init)
      ) {
        return false
      }

      const supportedProtocolsObjectNode =
        supportedProtocolsDeclarationNode.init

      const protocolObjectPropertyNode =
        (supportedProtocolsObjectNode.properties.find((property) => {
          if (
            !n.ObjectProperty.check(property) ||
            !n.MemberExpression.check(property.key) ||
            !n.Identifier.check(property.key.property)
          ) {
            throw new Error('Incorrectly typed supportedProtocols object')
          }

          return property.key.property.name === pascalCase(protocol)
        }) as n.ObjectProperty) ?? buildProtocolEntry(protocol)

      const protocolChainEntries = protocolObjectPropertyNode.value
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

      this.traverse(path)
    },
  })

  const content = print(ast).code
  writeCodeFile('./src/adapters/index.ts', content)
}

/*
import { <Product>Adapter } from './<protocol>/products/<product>/<product>Adapter'
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
[Protocol.<Protocol>]: {}
*/
function buildProtocolEntry(protocol: string) {
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
[Chain.<Chain>]: [...adapterEntries],
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
    chainId: Chain.<Chain>,
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
