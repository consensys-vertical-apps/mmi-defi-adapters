import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  Chain,
  DefiProvider,
  Protocol,
} from '@metamask-institutional/defi-adapters'
import {} from '@metamask-institutional/defi-adapters'
import { pascalCase } from '@metamask-institutional/defi-adapters'
import { Command } from 'commander'
import { lowerFirst } from 'lodash-es'
import { addProtocol } from '../utils/add-protocol.ts'
import { buildIntegrationTests } from '../utils/build-integration-tests.ts'
import { exportAdapter } from '../utils/export-adapter.ts'
import { writeAndLintFile } from '../utils/write-and-lint-file.ts'

export function copyAdapterCommand(program: Command) {
  program
    .command('copy-adapter')
    .argument('[sourceProtocolId]', 'Protocol to copy')
    .argument('[newProtocolId]', 'New protocol id (kebab-case)')
    .argument('[newProtocolKey]', 'New protocol Key (PascalCase)')
    .argument(
      '[chainKeys]',
      'List of chain keys to copy (e.g. Ethereum,Arbitrum,Linea',
    )
    .action(
      async (sourceProtocolId, newProtocolId, newProtocolKey, chainKeys) => {
        const defiProvider = new DefiProvider()

        await copyAdapter({
          protocolKey: newProtocolKey,
          protocolId: newProtocolId,
          chainKeys: chainKeys.split(',') as (keyof typeof Chain)[],
          sourceProtocolId: sourceProtocolId,
          defiProvider,
        })
      },
    )
}

async function copyAdapter(data: {
  protocolKey: string
  protocolId: string
  chainKeys: (keyof typeof Chain)[]
  sourceProtocolId: string
  defiProvider: DefiProvider
}) {
  // Find adapter file
  const sourceProtocolKey = Object.entries(Protocol).find(
    (protocol) => protocol[1] === data.sourceProtocolId,
  )![0]

  const sourceProtocolFolder = path.resolve(
    `./packages/adapters-library/src/adapters/${data.sourceProtocolId}`,
  )

  const newProtocolFolder = path.resolve(
    `./packages/adapters-library/src/adapters/${data.protocolId}`,
  )

  await addProtocol({
    protocolKey: data.protocolKey,
    protocolId: data.protocolId,
  })

  // Copy all protocol folders (except products and tests)
  await Promise.all(
    (await fs.readdir(sourceProtocolFolder))
      .filter((file) => !['tests', 'products'].includes(file))
      .map((file) =>
        deepCopy(path.join(sourceProtocolFolder, file), newProtocolFolder),
      ),
  )

  const productIds = (
    await data.defiProvider.getSupport({
      filterProtocolIds: [data.sourceProtocolId as Protocol],
    })
  )[data.sourceProtocolId as Protocol]!.map(
    (adapter) => adapter.protocolDetails.productId,
  )

  for (const productId of productIds) {
    const sourceAdapterClassName = `${sourceProtocolKey}${pascalCase(
      productId,
    )}Adapter`

    const newAdapterClassName = `${data.protocolKey}${pascalCase(
      productId,
    )}Adapter`

    const sourceAdapterPath = path.resolve(
      `./packages/adapters-library/src/adapters/${
        data.sourceProtocolId
      }/products/${productId}/${lowerFirst(sourceAdapterClassName)}.ts`,
    )

    const fileContent = await fs.readFile(sourceAdapterPath, 'utf-8')

    const newContent = fileContent
      .replace(
        /export class \S*Adapter/g,
        `export class ${newAdapterClassName}`,
      )
      .replace(/name:\s*'.*'/g, `name: ''`)
      .replace(/description:\s*'.*'/g, `description: ''`)
      .replace(/siteUrl:\s*'.*'/g, `siteUrl: ''`)
      .replace(/iconUrl:\s*'.*'/g, `iconUrl: ''`)

    const newAdapterFolder = path.join(
      newProtocolFolder,
      `products/${productId}`,
    )

    await writeAndLintFile(
      path.join(newAdapterFolder, `${lowerFirst(newAdapterClassName)}.ts`),
      newContent,
    )

    // Copy files in the product folder (except metadata)
    const sourceAdapterFolder = path.dirname(sourceAdapterPath)
    await Promise.all(
      (await fs.readdir(sourceAdapterFolder))
        .filter(
          (file) =>
            !['metadata', `${lowerFirst(sourceAdapterClassName)}.ts`].includes(
              file,
            ),
        )
        .map((file) =>
          deepCopy(path.join(sourceAdapterFolder, file), newAdapterFolder),
        ),
    )

    await buildIntegrationTests({
      protocolId: data.protocolId,
      productId,
    })
    await exportAdapter({
      protocolKey: data.protocolKey,
      protocolId: data.protocolId,
      productId,
      chainKeys: data.chainKeys,
      adapterClassName: newAdapterClassName,
    })
  }
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

  const fileContent = await fs.readFile(source, { encoding: 'utf-8' })

  await writeAndLintFile(
    path.join(destination, path.basename(source)),
    fileContent,
  )
}
