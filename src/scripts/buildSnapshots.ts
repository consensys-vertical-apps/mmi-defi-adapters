import { promises as fs } from 'fs'
import path from 'path'
import { Command } from 'commander'
import {
  getApr,
  getApy,
  getDeposits,
  getPositions,
  getPrices,
  getProfits,
  getTotalValueLocked,
  getWithdrawals,
} from '..'
import { Protocol } from '../adapters/protocols'
import { Chain, ChainName } from '../core/constants/chains'
import { bigintJsonStringify } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { chainProviders } from '../core/utils/chainProviders'
import type { TestCase } from '../types/testCase'
import { multiProtocolFilter } from './commandFilters'

export function buildSnapshots(program: Command) {
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
                  testCase.blockNumber ?? (await getLatestBlock(chainId))

                return {
                  blockNumber,
                  snapshot: await getPositions({
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
                  testCase.blockNumber ?? (await getLatestBlock(chainId))

                return {
                  blockNumber,
                  snapshot: await getProfits({
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
                  snapshot: await getDeposits({
                    ...testCase.input,
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                  }),
                }
              }

              case 'withdrawals': {
                return {
                  snapshot: await getWithdrawals({
                    ...testCase.input,
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                  }),
                }
              }

              case 'prices': {
                const blockNumber =
                  testCase.blockNumber ?? (await getLatestBlock(chainId))

                return {
                  blockNumber,
                  snapshot: await getPrices({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }
              }

              case 'tvl': {
                const blockNumber =
                  testCase.blockNumber ?? (await getLatestBlock(chainId))

                return {
                  blockNumber,
                  snapshot: await getTotalValueLocked({
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
                  testCase.blockNumber ?? (await getLatestBlock(chainId))

                return {
                  blockNumber,
                  snapshot: await getApy({
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
                  testCase.blockNumber ?? (await getLatestBlock(chainId))

                return {
                  blockNumber,
                  snapshot: await getApr({
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

async function getLatestBlock(chainId: Chain): Promise<number> {
  const provider = chainProviders[chainId]

  if (!provider) {
    throw new Error(`Provider missing for chain ${chainId}`)
  }

  return provider.getBlockNumber()
}
