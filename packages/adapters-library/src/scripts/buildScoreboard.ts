import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'
import { Chain, ChainIdToChainNameMap } from '../core/constants/chains'
import { filterMapSync } from '../core/utils/filters'
import { writeAndLintFile } from '../core/utils/writeAndLintFile'
import { DefiProvider } from '../defiProvider'
import {
  RpcInterceptedResponses,
  startRpcSnapshot,
} from '../tests/rpcInterceptor'
import type { TestCase } from '../types/testCase'
import { multiProtocolFilter } from './commandFilters'

type ScoreboardEntry = {
  key: string | undefined
  protocolId: string
  productId: string
  chain: string
  latency: number
  totalPools: number
} & RpcMetrics

type RpcMetrics = {
  totalCalls: number
  relativeMaxStartTime: number | undefined
  relativeMaxEndTime: number | undefined
  maxRpcRequestLatency: number
  totalGas: string
}

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

      const scoreboard: ScoreboardEntry[] = []

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

          console.log(
            `Running test case # Chain: ${
              testCase.chainId
            } - Protocol: ${protocolId} - Product: ${productId}${
              testCase.key ? ` - Key:${testCase.key}` : ''
            }`,
          )

          // Recreate the provider for each test case to avoid cached data
          const defiProvider = new DefiProvider({
            useMulticallInterceptor: false,
            disableEthersBatching: true,
          })

          const msw = startRpcSnapshot(
            Object.values(defiProvider.chainProvider.providers).map(
              (provider) => provider._getConnection().url,
            ),
          )

          const chainId = testCase.chainId

          const blockNumber = testCase.blockNumber

          const startTime = Date.now()

          const result = await defiProvider.getPositions({
            ...testCase.input,
            filterChainIds: [chainId],
            filterProtocolIds: [protocolId],
            filterProductIds: [productId],
            blockNumbers: {
              [chainId]: blockNumber,
            },
          })

          if (result.length === 0) {
            console.error('Snapshot with no results', {
              protocolId,
              productId,
              chainId,
            })
          }

          if (result.some((x) => !x.success)) {
            console.error('Snapshot failed', { protocolId, productId, chainId })
          }

          if (result.length > 1) {
            console.error('Snapshot with multiple results', {
              protocolId,
              productId,
              chainId,
            })
          }

          const endTime = Date.now()

          scoreboard.push(
            aggregateMetrics({
              interceptedResponses: msw.interceptedResponses,
              key: testCase.key,
              protocolId,
              productId,
              chainId,
              latency: endTime - startTime,
              totalPools: result.reduce(
                (acc, x) => acc + (!x.success ? 0 : x.tokens.length),
                0,
              ),
            }),
          )

          msw.stop()
        }
      }

      const scoreboardHtml = await readFile('./scoreboard.html', 'utf-8')
      const updatedHtml = scoreboardHtml.replace(
        /\/\/ ### BEGIN DATA INSERT ###.*\/\/ ### END DATA INSERT ###/s,
        `// ### BEGIN DATA INSERT ###\nconst data = ${JSON.stringify(
          scoreboard,
          null,
          2,
        )};\n// ### END DATA INSERT ###`,
      )
      await writeAndLintFile('./scoreboard.html', updatedHtml)

      process.exit()
    })
}

function aggregateMetrics({
  interceptedResponses,
  key,
  protocolId,
  productId,
  chainId,
  latency,
  totalPools,
}: {
  interceptedResponses: RpcInterceptedResponses
  key: string | undefined
  protocolId: Protocol
  productId: string
  chainId: Chain
  latency: number
  totalPools: number
}): ScoreboardEntry {
  const rpcMetrics = extractRpcMetrics(interceptedResponses)

  return {
    key: key,
    protocolId: protocolId,
    productId: productId,
    chain: ChainIdToChainNameMap[chainId],
    latency: latency / 1_000,
    totalPools,
    ...rpcMetrics,
  }
}

export function extractRpcMetrics(
  interceptedResponses: RpcInterceptedResponses,
): RpcMetrics {
  if (Object.values(interceptedResponses).length === 0) {
    return {
      relativeMaxStartTime: undefined,
      relativeMaxEndTime: undefined,
      totalCalls: 0,
      maxRpcRequestLatency: 0,
      totalGas: '0',
    }
  }

  let minStartTime: number | undefined
  let maxStartTime: number | undefined
  let minEndTime: number | undefined
  let maxEndTime: number | undefined
  let totalCalls = 0
  let maxTakenTime = 0
  let totalGas = 0n
  for (const rpcInterceptedResponse of Object.values(interceptedResponses)) {
    const metrics = rpcInterceptedResponse.metrics!
    if (minStartTime === undefined || metrics.startTime < minStartTime) {
      minStartTime = metrics.startTime
    }
    if (maxStartTime === undefined || metrics.startTime > maxStartTime) {
      maxStartTime = metrics.startTime
    }
    if (minEndTime === undefined || metrics.endTime < minEndTime) {
      minEndTime = metrics.endTime
    }
    if (maxEndTime === undefined || metrics.endTime > maxEndTime) {
      maxEndTime = metrics.endTime
    }

    if (metrics.timeTaken > maxTakenTime) {
      maxTakenTime = metrics.timeTaken
    }

    totalGas += BigInt(metrics.estimatedGas ?? 0)

    totalCalls++
  }

  return {
    relativeMaxStartTime: (maxStartTime! - minStartTime!) / 1_000,
    relativeMaxEndTime: (maxEndTime! - minStartTime!) / 1_000,
    totalCalls,
    maxRpcRequestLatency: maxTakenTime / 1_000,
    totalGas: totalGas.toString(),
  }
}
