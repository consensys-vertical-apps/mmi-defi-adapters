import path from 'node:path'
import { Command } from 'commander'
import { ChainIdToChainNameMap } from '../core/constants/chains'
import { filterMapSync } from '../core/utils/filters'
import { writeAndLintFile } from '../core/utils/writeAndLintFile'
import { DefiProvider } from '../defiProvider'
import type { TestCase } from '../types/testCase'
import { multiProtocolFilter } from './commandFilters'
import { startRpcSnapshot } from './rpcInterceptor'

export function buildScoreboard(program: Command, defiProvider: DefiProvider) {
  program
    .command('build-scoreboard')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-pd, --products <products>',
      'comma-separated products filter (e.g. stargate,aave-v2)',
    )
    .showHelpAfterError()
    .action(async ({ protocols, products }) => {
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

      const extractedValues: {
        key: string | undefined
        protocolId: string
        productId: string
        chain: string
        latency: number
        totalCalls: number
        relativeMaxStartTime: number | undefined
        relativeMaxEndTime: number | undefined
        maxRpcRequestLatency: number
        totalGas: string
      }[] = []

      for (const { protocolId, productId } of allProducts) {
        const testCases: TestCase[] = (
          await import(
            path.resolve(
              __dirname,
              `../adapters/${protocolId}/products/${productId}/tests/testCases`,
            )
          )
        ).testCases

        for (const testCase of testCases) {
          if (testCase.method !== 'positions') {
            continue
          }

          // Recreate the provider for each test case to avoid cached data
          const defiProvider = new DefiProvider({
            useMulticallInterceptor: false,
          })

          const msw = startRpcSnapshot(
            Object.values(defiProvider.chainProvider.providers).map(
              (provider) => provider._getConnection().url,
            ),
          )

          const chainId = testCase.chainId

          const blockNumber = testCase.blockNumber

          const startTime = Date.now()

          const firstRun = await defiProvider.getPositions({
            ...testCase.input,
            filterChainIds: [chainId],
            filterProtocolIds: [protocolId],
            filterProductIds: [productId],
            blockNumbers: {
              [chainId]: blockNumber,
            },
          })

          if (firstRun.some(x => !x.success)) {
            console.error('Snapshot failed', { protocolId, productId, chainId})
          }

          const endTime = Date.now()

          const timeTaken = endTime - startTime

          const interceptedRpcRequests = msw.interceptedRequests

          if (Object.values(interceptedRpcRequests).length === 0) {
            extractedValues.push({
              key: testCase.key,
              protocolId: protocolId,
              productId: productId,
              chain: ChainIdToChainNameMap[chainId],
              latency: timeTaken / 1_000,
              relativeMaxStartTime: undefined,
              relativeMaxEndTime: undefined,
              totalCalls: 0,
              maxRpcRequestLatency: 0,
              totalGas: '0',
            })

            continue
          }

          let minStartTime: number | undefined
          let maxStartTime: number | undefined
          let minEndTime: number | undefined
          let maxEndTime: number | undefined
          let totalCalls = 0
          let maxTakenTime = 0
          let totalGas = 0n
          for (const interceptedRpcRequest of Object.values(
            interceptedRpcRequests,
          )) {
            const request = interceptedRpcRequest.request!
            if (
              minStartTime === undefined ||
              request.startTime < minStartTime
            ) {
              minStartTime = request.startTime
            }
            if (
              maxStartTime === undefined ||
              request.startTime > maxStartTime
            ) {
              maxStartTime = request.startTime
            }
            if (minEndTime === undefined || request.endTime < minEndTime) {
              minEndTime = request.endTime
            }
            if (maxEndTime === undefined || request.endTime > maxEndTime) {
              maxEndTime = request.endTime
            }

            if (request.timeTaken > maxTakenTime) {
              maxTakenTime = request.timeTaken
            }

            totalGas += BigInt(request.estimatedGas ?? 0)

            totalCalls++
          }

          extractedValues.push({
            key: testCase.key,
            protocolId: protocolId,
            productId: productId,
            chain: ChainIdToChainNameMap[chainId],
            latency: timeTaken / 1_000,
            relativeMaxStartTime: (maxStartTime! - minStartTime!) / 1_000,
            relativeMaxEndTime: (maxEndTime! - minStartTime!) / 1_000,
            totalCalls,
            maxRpcRequestLatency: maxTakenTime / 1_000,
            totalGas: totalGas.toString(),
          })

          msw.stop()
        }
      }

      extractedValues.sort((a, b) => a.latency - b.latency)
      console.log(JSON.stringify(extractedValues, null, 2))

      await writeAndLintFile('./scoreboard.json', JSON.stringify(extractedValues, null, 2))
      process.exit()
    })
}
