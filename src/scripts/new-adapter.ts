import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { parse, visit, types, print } from 'recast'
import { camelCase, startCase } from 'lodash'
import { adapterTemplate } from './templates/adapter'

import n = types.namedTypes
import b = types.builders

export function addNewAdapterCommand(program: Command) {
  program
    .command('new-adapter')
    .argument('<protocol>', 'Protocol id (kebab-case)')
    .argument('<product>', 'Product name (kebab-case)')
    .showHelpAfterError()
    .action(async (protocol: string, productName: string) => {
      console.log('Add new adapter for protocol', protocol, productName)

      const protocolProductsPath = path.resolve(
        __dirname,
        `../adapters/${protocol}/products`,
      )

      if (!fs.existsSync(protocolProductsPath)) {
        // TODO Call method to create a protocol folder
        console.error(`Protocol folder does not exist: ${protocolProductsPath}`)
        return
      }

      const productPath = path.resolve(protocolProductsPath, productName)

      if (!fs.existsSync(productPath)) {
        console.log(`create folder ${productPath}`)
        fs.mkdirSync(productPath)
      }

      const adapterFilePath = newAdapterTemplate(
        protocol,
        productPath,
        productName,
      )

      exportAdapter(adapterFilePath)
    })
}

function newAdapterTemplate(
  protocol: string,
  productPath: string,
  productName: string,
): string {
  const productNameCamelCase = camelCase(productName)
  const productNamePascalCase = startCase(productNameCamelCase).replace(
    / /g,
    '',
  )
  const protocolPascalCase = startCase(camelCase(protocol)).replace(/ /g, '')

  const adapterFilePath = path.resolve(
    productPath,
    `${productNameCamelCase}Adapter.ts`,
  )

  fs.writeFileSync(
    adapterFilePath,
    adapterTemplate(protocolPascalCase, productNamePascalCase),
  )

  return adapterFilePath
}

function exportAdapter(_adapterFilePath: string) {
  // TODO Add new adapter to list in src/adapters/index.ts
  const contents = fs.readFileSync('./src/adapters/index.ts', 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitVariableDeclarator(path) {
      const node = path.node
      if ((node.id as n.Identifier).name !== 'supportedProtocols') {
        return false
      }

      console.log((node.id as n.Identifier).name)

      for (const properties of (node.init as n.ObjectExpression).properties) {
        if (!n.ObjectProperty.assert(properties)) {
          continue
        }
        const protocolName = (
          (properties.key as n.MemberExpression).property as n.Identifier
        ).name
        console.log(protocolName)

        if (protocolName === 'Example') {
          const protocolChainEntries = properties.value as n.ObjectExpression
          console.log(protocolChainEntries)
          console.log('BEGIN LEVEL 1')
          const chainNode = protocolChainEntries
            .properties[0] as n.ObjectProperty
          console.log(chainNode)
          console.log('END LEVEL 1')
          // console.log('BEGIN LEVEL 2 (ARRAY)')
          // const arrayNode = chainNode.value as n.ArrayExpression
          // console.log(arrayNode)
          // console.log('END LEVEL 2 (ARRAY)')
          // console.log('BEGIN LEVEL 3 (FACTORY)')
          // const factoryNode = arrayNode.elements[0] as n.ArrowFunctionExpression
          // console.log(factoryNode)
          // console.log('END LEVEL 3 (FACTORY)')
          // console.log('BEGIN LEVEL 4 (Adapeter arguments)')
          // const adapterArgumentsNode = (factoryNode.body as n.NewExpression)
          //   .arguments[0] as n.ObjectExpression
          // console.log(adapterArgumentsNode)
          // console.log('END LEVEL 4 (Adapeter arguments)')
          // console.log('BEGIN LEVEL 5 (Adapeter argument nodes)')
          // const adapterArgumentsNode1 = adapterArgumentsNode
          //   .properties[0] as n.ObjectProperty
          // const adapterArgumentsNode2 = adapterArgumentsNode
          //   .properties[1] as n.ObjectProperty
          // const adapterArgumentsNode3 = adapterArgumentsNode
          //   .properties[2] as n.ObjectProperty
          // console.log(
          //   adapterArgumentsNode1,
          //   adapterArgumentsNode2,
          //   adapterArgumentsNode3,
          // )
          // console.log('END LEVEL 5 (Adapeter argument nodes)')
          const newEntry = newChainEntry()
          protocolChainEntries.properties = [
            ...protocolChainEntries.properties,
            newEntry,
          ]
        }
      }

      this.traverse(path)
    },
  })

  const content = print(ast).code
  fs.writeFileSync('./src/adapters/index.ts', content, 'utf-8')

  //console.log('XXXXXXXXXX', ast.program.body.at(-1))
}

function newChainEntry() {
  const key = b.memberExpression(
    b.identifier('Chain'),
    b.identifier('Ethereum'),
  )
  const value = b.arrayExpression([newFactoryEntry()])

  const temp = b.objectProperty(key, value)
  temp.computed = true
  console.log('AAAAAAAAA', temp)
  return temp
}

function newFactoryEntry() {
  return b.arrowFunctionExpression(
    [b.identifier('provider')],
    b.newExpression(b.identifier('ExampleProductAdapter'), [
      b.objectExpression([
        b.objectProperty(b.identifier('metadata'), b.objectExpression([])),
        b.objectProperty(
          b.identifier('chainId'),
          b.memberExpression(b.identifier('Chain'), b.identifier('Ethereum')),
        ),
        b.objectProperty(b.identifier('provider'), b.identifier('provider')),
      ]),
    ]),
  )
}
