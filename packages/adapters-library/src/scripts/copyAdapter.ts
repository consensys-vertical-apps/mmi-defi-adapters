import { promises as fs, Stats } from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import { Command } from 'commander'
import partition from 'lodash/partition'
import { parse, print, types, visit } from 'recast'
import { Protocol } from '../adapters/protocols'
import { supportedProtocols } from '../adapters/supportedProtocols'
import { AdaptersController } from '../core/adaptersController'
import { Chain, ChainName } from '../core/constants/chains'
import { IMetadataBuilder } from '../core/decorators/cacheToFile'
import { ProviderMissingError } from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { lowerFirst, pascalCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { writeAndLintFile } from '../core/utils/writeAndLintFile'
import { Json } from '../types/json'
import { getMetadataInvalidAddresses } from './addressValidation'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'
import { sortEntries } from './utils/sortEntries'
import n = types.namedTypes
import b = types.builders
import {
  addProtocol,
  buildIntegrationTests,
  exportAdapter,
} from './newAdapterCommand'

export async function copyAdapter(data: {
  protocolKey: string
  protocolId: string
  productId: string
  chainKeys: (keyof typeof Chain)[]
  sourceProtocolId: string
  sourceProductId: string
}) {
  // Find adapter file
  const sourceProtocolKey = Object.entries(Protocol).find(
    (protocol) => protocol[1] === data.sourceProtocolId,
  )![0]

  const sourceAdapterClassName = `${sourceProtocolKey}${pascalCase(
    data.sourceProductId,
  )}Adapter`

  const newAdapterClassName = `${data.protocolKey}${pascalCase(
    data.productId,
  )}Adapter`

  const sourceAdapterPath = path.resolve(
    `./packages/adapters-library/src/adapters/${
      data.sourceProtocolId
    }/products/${data.sourceProductId}/${lowerFirst(
      sourceAdapterClassName,
    )}.ts`,
  )

  console.log('AAAAAAAAAAAAAA', {
    sourceProtocolKey,
    sourceProtocolId: data.sourceProtocolId,
    sourceProductId: data.sourceProductId,
    sourceAdapterPath,
  })

  // Copy code and modify it
  const fileContent = await fs.readFile(sourceAdapterPath, 'utf-8')

  const newContent = fileContent
    .replace(/export class \S*Adapter/g, `export class ${newAdapterClassName}`)
    .replace(
      new RegExp(`productId = '${data.sourceProductId}'`, 'g'),
      `productId = '${data.productId}'`,
    )
    .replace(/name:\s*'.*'/g, `name: ''`)
    .replace(/description:\s*'.*'/g, `description: ''`)
    .replace(/siteUrl:\s*'.*'/g, `siteUrl: ''`)
    .replace(/iconUrl:\s*'.*'/g, `iconUrl: ''`)

  const newProtocolFolder = path.resolve(
    `./packages/adapters-library/src/adapters/${data.protocolId}`,
  )
  const newAdapterFolder = path.join(
    newProtocolFolder,
    `products/${data.productId}`,
  )

  await writeAndLintFile(
    path.join(newAdapterFolder, `${lowerFirst(newAdapterClassName)}.ts`),
    newContent,
  )
  console.log('COPY ADAPTER FILE', {
    fileName: path.join(
      newAdapterFolder,
      `${lowerFirst(newAdapterClassName)}.ts`,
    ),
  })

  // Copy files in the product folder (except metadata)
  const sourceAdapterFolder = path.dirname(sourceAdapterPath)
  const sourceAdapterSupportFiles = (await fs.readdir(sourceAdapterFolder))
    .filter(
      (file) =>
        !['metadata', `${lowerFirst(sourceAdapterClassName)}.ts`].includes(
          file,
        ),
    )
    .map((file) => path.join(sourceAdapterFolder, file))

  // Iterate through each source directory
  for (const source of sourceAdapterSupportFiles) {
    await deepCopy(source, newAdapterFolder)
  }

  // Copy all protocol folders (except products and tests)
  const sourceProtocolFolder = path.dirname(path.dirname(sourceAdapterFolder))
  const sourceProtocolSupportFiles = (await fs.readdir(sourceProtocolFolder))
    .filter((file) => !['tests', 'products'].includes(file))
    .map((file) => path.join(sourceProtocolFolder, file))

  // Iterate through each source directory
  for (const source of sourceProtocolSupportFiles) {
    await deepCopy(source, newProtocolFolder)
  }

  // console.log('PPPPPPPPPPPPPPPPPPPP', {
  //   sourceAdapterSupportFiles,
  //   sourceProtocolSupportFiles,
  // })

  // New adapter tasks
  await buildIntegrationTests({
    protocolKey: data.protocolKey,
    protocolId: data.protocolId,
    productId: data.productId,
  })
  await addProtocol({
    protocolKey: data.protocolKey,
    protocolId: data.protocolId,
  })
  await exportAdapter({
    protocolKey: data.protocolKey,
    protocolId: data.protocolId,
    productId: data.productId,
    chainKeys: data.chainKeys,
    adapterClassName: newAdapterClassName,
  })
}

async function deepCopy(source: string, destination: string) {
  const sourceStat = await fs.stat(source)

  if (sourceStat.isDirectory()) {
    const entries = await fs.readdir(source, { withFileTypes: true })

    for (const entry of entries) {
      await deepCopy(
        path.join(entry.path, entry.name),
        path.join(destination, path.basename(source)),
      )
    }

    return
  }

  await fs.copyFile(source, path.join(destination, path.basename(source)))
  // console.log('COPY FILE', {
  //   source,
  //   destination: path.join(destination, path.basename(source)),
  // })
}
