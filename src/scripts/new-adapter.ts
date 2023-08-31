import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { parse, visit, types, print } from 'recast'
import { adapterTemplate } from './templates/adapter'
import { camelCase, kebabCase, pascalCase } from '../core/utils/caseConversion'
import { partition } from 'lodash'

import n = types.namedTypes
import b = types.builders

export function addNewAdapterCommand(program: Command) {
  program
    .command('new-adapter')
    .argument('<protocol>', 'Protocol id (kebab-case)')
    .argument('<product>', 'Product name (kebab-case)')
    .showHelpAfterError()
    .action(async (protocol: string, product: string) => {
      console.log('Add new adapter for protocol', protocol, product)

      const protocolProductsPath = path.resolve(
        `./src/adapters/${protocol}/products`,
      )

      if (!fs.existsSync(protocolProductsPath)) {
        // TODO Call method to create a protocol folder
        console.error(`Protocol folder does not exist: ${protocolProductsPath}`)
        return
      }

      const productPath = path.resolve(protocolProductsPath, product)

      if (!fs.existsSync(productPath)) {
        console.log(`create folder ${productPath}`)
        fs.mkdirSync(productPath)
      }

      newAdapterTemplate(protocol, product, productPath)

      exportAdapter(protocol, product, ['Ethereum'])
    })
}

function newAdapterTemplate(
  protocol: string,
  product: string,
  productPath: string,
) {
  const adapterFilePath = path.resolve(
    productPath,
    `${camelCase(product)}Adapter.ts`,
  )

  fs.writeFileSync(
    adapterFilePath,
    adapterTemplate(pascalCase(protocol), pascalCase(product)),
  )
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

      const newImportEntry = buildImportEntry(
        pascalCase(product),
        `./${kebabCase(protocol)}/products/${kebabCase(product)}/${camelCase(
          product,
        )}Adapter`,
      )

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
        const newAdapterEntry = buildAdapterEntry(
          pascalCase(chain),
          pascalCase(product),
        )
        const newChainEntry = buildChainEntry(pascalCase(chain), [
          newAdapterEntry,
        ])

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
  fs.writeFileSync('./src/adapters/index.ts', content, 'utf-8')
}

function buildImportEntry(product: string, adapterFilePath: string) {
  return b.importDeclaration(
    [b.importSpecifier(b.identifier(`${product}Adapter`))],
    b.literal(adapterFilePath),
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
  const key = b.memberExpression(b.identifier('Chain'), b.identifier(chain))
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
  const body = b.newExpression(b.identifier(`${product}Adapter`), [
    b.objectExpression([
      b.objectProperty(b.identifier('metadata'), b.objectExpression([])),
      b.objectProperty(
        b.identifier('chainId'),
        b.memberExpression(b.identifier('Chain'), b.identifier(chain)),
      ),
      b.objectProperty(b.identifier('provider'), b.identifier('provider')),
    ]),
  ])

  return b.arrowFunctionExpression(params, body)
}
