import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import * as recast from 'recast'
import { camelCase, forEach, startCase } from 'lodash'
import { adapterTemplate } from './templates/adapter'

import n = recast.types.namedTypes

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
  const ast = recast.parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  recast.visit(ast, {
    visitVariableDeclarator(path) {
      const node = path.node
      if ((node.id as n.Identifier).name !== 'supportedProtocols') {
        return false
      }

      console.log((node.id as n.Identifier).name)

      for (const temp of (node.init as n.ObjectExpression).properties) {
        const protocolName = (
          ((temp as n.ObjectProperty).key as n.MemberExpression)
            .property as n.Identifier
        ).name
        console.log(protocolName)
      }

      this.traverse(path)
    },
  })

  //console.log('XXXXXXXXXX', ast.program.body.at(-1))
}
