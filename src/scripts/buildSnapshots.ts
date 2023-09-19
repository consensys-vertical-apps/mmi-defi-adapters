import { promises as fs } from 'fs'
import path from 'path'
import { Command } from 'commander'
import {
  getDeposits,
  getPositions,
  getPrices,
  getTodaysProfits,
  getWithdrawals,
} from '..'
import { Protocol } from '../adapters'
import { TestCase } from '../adapters/test'
import { Chain, ChainName } from '../core/constants/chains'
import { bigintJsonStringify } from '../core/utils/bigint-json'
import { chainProviders } from '../core/utils/chainProviders'
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
            path.resolve(__dirname, `../adapters/${protocolId}/tests/tests`)
          )
        ).testCases

        for (const testCase of testCases) {
          const chainId = testCase.chainId
          const blockNumber = await getLatestBlock(chainId)

          const snapshot = await (async () => {
            switch (testCase.method) {
              case 'positions': {
                return getPositions({
                  ...testCase.input,
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                  blockNumbers: {
                    [chainId]: blockNumber,
                  },
                })
              }

              case 'profits': {
                return getTodaysProfits({
                  ...testCase.input,
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                  blockNumbers: {
                    [chainId]: blockNumber,
                  },
                })
              }

              case 'deposits': {
                return getDeposits({
                  ...testCase.input,
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                })
              }

              case 'withdrawals': {
                return getWithdrawals({
                  ...testCase.input,
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                })
              }

              case 'prices': {
                return getPrices({
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                  blockNumbers: {
                    [chainId]: blockNumber,
                  },
                })
              }
            }
          })()

          const snapshotFileContent = {
            blockNumber,
            snapshot,
          }

          await fs.writeFile(
            `./src/adapters/${protocolId}/tests/snapshots/${
              ChainName[testCase.chainId]
            }.${testCase.method}.${testCase.id}.json`,
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
