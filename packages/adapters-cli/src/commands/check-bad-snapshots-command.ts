import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import {
  ChainName,
  DefiProvider,
  multiProtocolFilter,
  filterMapSync,
  type TestCase,
} from '@metamask-institutional/defi-adapters'
import { kebabCase } from 'lodash'

type BadSnapshotDetails = {
  protocolId: string
  productId: string
  fileName: string
}

export function checkBadSnapshotsCommand(
  program: Command,
  defiProvider: DefiProvider,
) {
  program
    .command('check-bad-snapshots')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-pd, --products <products>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .showHelpAfterError()
    .action(async ({ protocols, products, key }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterProductIds = (products as string | undefined)?.split(',')

      const allProtocols = await defiProvider.getSupport({ filterProtocolIds })
      const allProducts = Object.values(allProtocols).flatMap(
        (protocolAdapters) =>
          filterMapSync(protocolAdapters, (adapter) => {
            if (
              filterProductIds &&
              !filterProductIds.includes(adapter.protocolDetails.productId)
            ) {
              return undefined
            }

            return {
              protocolId: adapter.protocolDetails.protocolId,
              productId: adapter.protocolDetails.productId,
            }
          }),
      )

      const emptySnapshots: BadSnapshotDetails[] = []
      const errorSnapshots: BadSnapshotDetails[] = []
      const orphanSnapshotFiles: BadSnapshotDetails[] = []

      for (const { protocolId, productId } of allProducts) {
        const snapshotsDir = `./packages/adapters-library/src/adapters/${protocolId}/products/${productId}/tests/snapshots`

        const testCases: TestCase[] = (
          await import(
            path.resolve(
              __dirname,
              `../adapters/${protocolId}/products/${productId}/tests/testCases`,
            )
          )
        ).testCases

        const testCaseFileNames = testCases.map((testCase) => {
          return `${ChainName[testCase.chainId]}.${testCase.method}${
            testCase.key ? `.${kebabCase(testCase.key)}` : ''
          }.json`
        })

        const entries = await fs.readdir(snapshotsDir, { withFileTypes: true })

        for (const entry of entries) {
          const match = entry.name.match(
            /^.*\.(positions|profits|deposits|withdrawals|repays|borrows|prices|tvl|tx-params)(?:\.[^.]+)?\.json$/,
          )

          if (!match || !match[1]) {
            throw Error(`Invalid snapshot file: ${entry.path}/${entry.name}`)
          }

          const parsedFile = JSON.parse(
            await fs.readFile(`${entry.path}/${entry.name}`, 'utf-8'),
          )

          if (!testCaseFileNames.includes(entry.name)) {
            orphanSnapshotFiles.push({
              protocolId,
              productId,
              fileName: entry.name,
            })

            continue
          }

          if (['positions', 'profits', 'prices', 'tvl'].includes(match[1])) {
            if (parsedFile.snapshot.length === 0) {
              emptySnapshots.push({
                protocolId,
                productId,
                fileName: entry.name,
              })
            } else if (
              parsedFile.snapshot.some(
                (item: { success: boolean }) => !item.success,
              )
            ) {
              errorSnapshots.push({
                protocolId,
                productId,
                fileName: entry.name,
              })
            }
          } else {
            if (parsedFile.snapshot.movements?.length === 0) {
              emptySnapshots.push({
                protocolId,
                productId,
                fileName: entry.name,
              })
            } else if (!parsedFile.snapshot.success) {
              errorSnapshots.push({
                protocolId,
                productId,
                fileName: entry.name,
              })
            }
          }
        }
      }

      console.log('--- Bad Snapshots Summary ---')

      console.log('\nAdapter snapshots files with no corresponding test case:')
      for (const details of orphanSnapshotFiles) {
        console.log(
          `No corresponding test case for snapshot for protocol ${details.protocolId} and product ${details.productId} in file ${details.fileName}`,
        )
      }

      console.log('\nAdapter snapshots with empty responses:')
      for (const details of emptySnapshots) {
        console.log(
          `Empty snapshot for protocol ${details.protocolId} and product ${details.productId} in file ${details.fileName}`,
        )
      }

      console.log('\nAdapter snapshots with unsuccessful responses:')
      for (const details of errorSnapshots) {
        console.log(
          `Error in snapshot for protocol ${details.protocolId} and product ${details.productId} in file ${details.fileName}`,
        )
      }

      console.log()
    })
}
