import { promises as fs } from 'fs'
import path from 'path'
import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'
import { Chain, ChainName } from '../core/constants/chains'
import { ProviderMissingError } from '../core/errors/errors'
import { bigintJsonStringify } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { DefiProvider } from '../defiProvider'
import type { TestCase } from '../types/testCase'
import { multiProtocolFilter } from './commandFilters'

export function buildSnapshots(program: Command, defiProvider: DefiProvider) {
  program
    .command('build-snapshots')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .showHelpAfterError()
    .action(async ({ protocols }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)

      for (const protocolId of Object.values(Protocol)) {
        if (filterProtocolIds && !filterProtocolIds.includes(protocolId)) {
          continue
        }

        const testCases: TestCase[] = (
          await import(
            path.resolve(__dirname, `../adapters/${protocolId}/tests/testCases`)
          )
        ).testCases

        for (const testCase of testCases) {
          const chainId = testCase.chainId

          const snapshotFileContent = await (async () => {
            switch (testCase.method) {
              case 'positions': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                return {
                  blockNumber,
                  snapshot: await defiProvider.getPositions({
                    ...testCase.input,
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }
              }

              case 'profits': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                return {
                  blockNumber,
                  snapshot: await defiProvider.getProfits({
                    ...testCase.input,
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    toBlockNumbersOverride: {
                      [chainId]: blockNumber,
                    },
                  }),
                }
              }

              case 'deposits': {
                return {
                  snapshot: await defiProvider.getDeposits({
                    ...testCase.input,
                    chainId: chainId,
                    protocolId: protocolId,
                  }),
                }
              }

              case 'withdrawals': {
                return {
                  snapshot: await defiProvider.getWithdrawals({
                    ...testCase.input,
                    chainId: chainId,
                    protocolId: protocolId,
                  }),
                }
              }

              case 'prices': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                return {
                  blockNumber,
                  snapshot: await defiProvider.getPrices({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                    filterProtocolToken: testCase.filterProtocolToken,
                  }),
                }
              }

              case 'tvl': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                return {
                  blockNumber,
                  snapshot: await defiProvider.getTotalValueLocked({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }
              }

              case 'apy': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                return {
                  blockNumber,
                  snapshot: await defiProvider.getApy({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }
              }

              case 'apr': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                return {
                  blockNumber,
                  snapshot: await defiProvider.getApr({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }
              }
            }
          })()

          const filePath = `./src/adapters/${protocolId}/tests/snapshots/${
            ChainName[testCase.chainId]
          }.${testCase.method}${
            testCase.key ? `.${kebabCase(testCase.key)}` : ''
          }.json`

          await fs.mkdir(path.dirname(filePath), { recursive: true })

          await fs.writeFile(
            filePath,
            bigintJsonStringify(snapshotFileContent, 2),
            'utf-8',
          )
        }
      }
    })
}

async function getLatestStableBlock(
  provider: CustomJsonRpcProvider,
  chainId: Chain,
): Promise<number> {
  if (!provider) {
    throw new ProviderMissingError(chainId)
  }

  return provider.getStableBlockNumber()
}
