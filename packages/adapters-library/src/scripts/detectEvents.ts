import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { ethers } from 'ethers'
import { Chain, ChainIdToChainNameMap } from '../core/constants/chains'
import { filterMapSync } from '../core/utils/filters'
import { DefiProvider } from '../defiProvider'
import type { TestCase } from '../types/testCase'
import { multiProtocolFilter } from './commandFilters'
export function detectEvents(program: Command, defiProvider: DefiProvider) {
  program
    .command('detect-events')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-pd, --products <products>',
      'comma-separated products filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-k, --key <test-key>',
      'test key must be used with protocols filter',
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

      for (const { protocolId, productId } of allProducts) {
        const testCases: TestCase[] = (
          await import(
            path.resolve(
              __dirname,
              `../adapters/${protocolId}/products/${productId}/tests/testCases`,
            )
          )
        ).testCases

        const productEntry = {
          protocolId,
          productId,
          data: [] as {
            chainId: Chain
            userAddress: string
            events: {
              topic0: string
              topic0Name: string
              topicIndex: number
              txHash: string
            }[]
          }[],
        }

        for (const testCase of testCases) {
          if (key && testCase.key !== key) {
            continue
          }

          if (testCase.method !== 'positions') {
            continue
          }

          // TODO Add Solana support for snapshots
          if (testCase.chainId === Chain.Solana) {
            continue
          }

          const { userAddress, filterProtocolTokens } = testCase.input
          const provider =
            defiProvider.chainProvider.providers[testCase.chainId]

          if (!filterProtocolTokens || filterProtocolTokens.length === 0) {
            continue
          }

          const results = await Promise.all(
            filterProtocolTokens.map(async (poolAddress) => {
              const logsByTopic = await Promise.allSettled([
                provider.getLogs({
                  address: poolAddress,
                  fromBlock: 0,
                  toBlock: 'latest',
                  topics: [
                    null,
                    ethers.zeroPadValue(userAddress, 32),
                    null,
                    null,
                  ],
                }),
                provider.getLogs({
                  address: poolAddress,
                  fromBlock: 0,
                  toBlock: 'latest',
                  topics: [
                    null,
                    null,
                    ethers.zeroPadValue(userAddress, 32),
                    null,
                  ],
                }),

                provider.getLogs({
                  address: poolAddress,
                  fromBlock: 0,
                  toBlock: 'latest',
                  topics: [
                    null,
                    null,
                    null,
                    ethers.zeroPadValue(userAddress, 32),
                  ],
                }),
              ])

              return logsByTopic.map((log) =>
                log.status === 'fulfilled' ? log.value : [],
              )
            }),
          )

          const filterResults = (
            results: ethers.Log[],
            index: number,
            resultsMap: Map<string, ethers.Log>,
          ) => {
            const groupedLogs = results.reduce((acc, log) => {
              acc.set(log.topics[0]!, log)
              return acc
            }, new Map<string, ethers.Log>())

            if (index === 0) {
              for (const [topic0, log] of groupedLogs.entries()) {
                resultsMap.set(topic0, log)
              }
            } else {
              for (const topic0 of resultsMap.keys()) {
                if (!groupedLogs.has(topic0)) {
                  resultsMap!.delete(topic0)
                }
              }
            }
          }

          const topic1Results = new Map<string, ethers.Log>()
          const topic2Results = new Map<string, ethers.Log>()
          const topic3Results = new Map<string, ethers.Log>()
          for (const [index, logsEntries] of results.entries()) {
            filterResults(logsEntries[0]!, index, topic1Results)
            filterResults(logsEntries[1]!, index, topic2Results)
            filterResults(logsEntries[2]!, index, topic3Results)
          }

          const testCaseEntry = {
            chainId: testCase.chainId,
            userAddress,
            events: [
              ...Array.from(topic1Results.values()).map((log) => ({
                topic0: log.topics[0]!,
                topic0Name: topic0Name(log.topics[0]!),
                topicIndex: 1,
                txHash: log.transactionHash,
              })),
              ...Array.from(topic2Results.values()).map((log) => ({
                topic0: log.topics[0]!,
                topic0Name: topic0Name(log.topics[0]!),
                topicIndex: 2,
                txHash: log.transactionHash,
              })),
              ...Array.from(topic3Results.values()).map((log) => ({
                topic0Name: topic0Name(log.topics[0]!),
                topic0: log.topics[0]!,
                topicIndex: 3,
                txHash: log.transactionHash,
              })),
            ],
          }

          productEntry.data.push(testCaseEntry)
        }

        console.log(JSON.stringify(productEntry, null, 2))
      }

      process.exit()
    })
}

const topic0cache = new Map<string, string>()

function topic0Name(topic0: string): string {
  if (topic0cache.has(topic0)) {
    return topic0cache.get(topic0)!
  }

  const topic0FilePath = `/home/bernardo/repos/topic0/with_parameter_names/${topic0.slice(
    2,
  )}`
  try {
    const name = fs.readFileSync(topic0FilePath, 'utf8').toString().trim()
    topic0cache.set(topic0, name)
    return name
  } catch (error) {
    return ''
  }
}
