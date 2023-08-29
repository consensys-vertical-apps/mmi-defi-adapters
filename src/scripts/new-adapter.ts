import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { camelCase } from 'lodash'
import { adapterTemplate } from './templates/adapter'

export function addNewAdapterCommand(program: Command) {
  program
    .command('new-adapter')
    .argument('<protocol>', 'Protocol id (kebab-case)')
    .argument('<product>', 'Product name (kebab-case)')
    .showHelpAfterError()
    .action(async (protocolId: string, productName: string) => {
      console.log('Add new adapter for protocol', protocolId, productName)

      const protocolProductsPath = path.resolve(
        __dirname,
        `../adapters/${protocolId}/products`,
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

      const adapterFilePath = newAdapterTemplate(productPath, productName)

      exportAdapter(adapterFilePath)
    })
}

function newAdapterTemplate(productPath: string, productName: string): string {
  const productNameCamelCase = camelCase(productName)

  const adapterFilePath = path.resolve(
    productPath,
    `${productNameCamelCase}Adapter.ts`,
  )

  fs.writeFileSync(adapterFilePath, adapterTemplate(productNameCamelCase))

  return adapterFilePath
}

function exportAdapter(_adapterFilePath: string) {
  // TODO Add new adapter to list in src/adapters/index.ts
  // Try recast
}
