import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Chain, ChainIdToChainNameMap } from '../core/constants/chains'
import { bigintJsonParse } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { DefiProvider } from '../defiProvider'
import { getInvalidAddresses } from '../scripts/addressValidation'
import { protocolFilter } from '../scripts/commandFilters'
import { RpcInterceptedResponse, startRpcMock } from '../scripts/rpcInterceptor'
import { TestCase } from '../types/testCase'
import { Protocol } from './protocols'
import {
  type GetTransactionParams,
  supportedProtocols,
} from './supportedProtocols'

import { testCases as lidoStEthTestCases } from './lido/products/st-eth/tests/testCases'
import { testCases as lidoWstEthTestCases } from './lido/products/wst-eth/tests/testCases'

const TEST_TIMEOUT = 300000

const defiProvider = new DefiProvider({
  useMulticallInterceptor: false,
})
const defiProviderWithMulticall = new DefiProvider({
  useMulticallInterceptor: true,
})

const filterProtocolId = protocolFilter(
  process.env.DEFI_ADAPTERS_TEST_FILTER_PROTOCOL,
)

const filterProductId = process.env.DEFI_ADAPTERS_TEST_FILTER_PRODUCT

// @ts-ignore
const normalizeNegativeZero = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'number' && Object.is(obj[key], -0)) {
      obj[key] = Math.abs(obj[key])
    } else if (obj[key] && typeof obj[key] === 'object') {
      normalizeNegativeZero(obj[key])
    }
  })
  return obj
}

const allTestCases = {
  [Protocol.AaveV2]: {},
  [Protocol.AaveV3]: {},
  [Protocol.AngleProtocol]: {},
  [Protocol.Beefy]: {},
  [Protocol.CarbonDeFi]: {},
  [Protocol.ChimpExchange]: {},
  [Protocol.CompoundV2]: {},
  [Protocol.Convex]: {},
  [Protocol.Curve]: {},
  [Protocol.Deri]: {},
  [Protocol.Ethena]: {},
  [Protocol.EtherFi]: {},
  [Protocol.Flux]: {},
  [Protocol.Gmx]: {},
  [Protocol.IZiSwap]: {},
  [Protocol.Lido]: {
    ['st-eth']: lidoStEthTestCases,
    ['wst-eth']: lidoWstEthTestCases,
  },
  [Protocol.Lynex]: {},
  [Protocol.Maker]: {},
  [Protocol.MendiFinance]: {},
  [Protocol.MorphoAaveV2]: {},
  [Protocol.MorphoAaveV3]: {},
  [Protocol.MorphoBlue]: {},
  [Protocol.MorphoCompoundV2]: {},
  [Protocol.MountainProtocol]: {},
  [Protocol.PancakeswapV2]: {},
  [Protocol.Pendle]: {},
  [Protocol.PricesV2]: {},
  [Protocol.QuickswapV2]: {},
  [Protocol.Renzo]: {},
  [Protocol.RocketPool]: {},
  [Protocol.Solv]: {},
  [Protocol.Sonne]: {},
  [Protocol.SparkV1]: {},
  [Protocol.StakeWise]: {},
  [Protocol.Stargate]: {},
  [Protocol.SushiswapV2]: {},
  [Protocol.Swell]: {},
  [Protocol.SyncSwap]: {},
  [Protocol.UniswapV2]: {},
  [Protocol.UniswapV3]: {},
  [Protocol.Xfai]: {},
  [Protocol.ZeroLend]: {},
} as Record<Protocol, Record<string, TestCase[]>>

runAllTests()

function runAllTests() {
  console.log('AAAAAAA', {
    protocolFilter: process.env.DEFI_ADAPTERS_TEST_FILTER_PROTOCOL,
    productFilter: process.env.DEFI_ADAPTERS_TEST_FILTER_PRODUCT,
  })

  if (filterProtocolId) {
    const protocolTestCases = allTestCases[filterProtocolId]

    if (filterProductId) {
      const productTestCases = protocolTestCases[filterProductId]

      if (!productTestCases) {
        throw new Error(
          `Test cases for product ${filterProductId} and protocol ${filterProtocolId} not found`,
        )
      }

      describe(filterProtocolId, () => {
        runProductTests(filterProtocolId, filterProductId, productTestCases)
      })

      return
    }

    Object.entries(protocolTestCases).forEach(
      ([productId, productTestCases]) => {
        describe(filterProtocolId, () => {
          runProductTests(filterProtocolId, productId, productTestCases)
        })
      },
    )

    return
  }

  Object.entries(allTestCases).forEach(([protocolId, protocolTestCases]) => {
    Object.entries(protocolTestCases).forEach(
      ([productId, productTestCases]) => {
        describe(protocolId, () => {
          runProductTests(protocolId as Protocol, productId, productTestCases)
        })
      },
    )
  })
}

function runProductTests(
  protocolId: Protocol,
  productId: string,
  testCases: TestCase[],
) {
  describe(productId, () => {
    let rpcMockStop: (() => void) | undefined

    beforeAll(async () => {
      const allMocks = (
        await Promise.all(
          testCases.map(async (testCase) => {
            const { rpcResponses } = await loadJsonFile(
              testCase,
              protocolId,
              productId,
            )

            if (!rpcResponses) {
              return []
            }

            return Object.entries(rpcResponses).map(([key, responses]) => ({
              key,
              responses,
            }))
          }),
        )
      )
        .flatMap((x) => x)
        .reduce((acc, x) => {
          acc[x.key] = x.responses
          return acc
        }, {} as RpcInterceptedResponse)

      const chainUrls = Object.values(defiProvider.chainProvider.providers).map(
        (rpcProvider) => rpcProvider._getConnection().url,
      )

      if (Object.keys(allMocks).length > 0) {
        const { stop } = startRpcMock(allMocks, chainUrls)
        rpcMockStop = stop
      }
    })

    afterAll(() => {
      rpcMockStop?.()
    })

    const protocolChains = Object.keys(supportedProtocols[protocolId]).map(
      (chainIdKey) => Number(chainIdKey),
    ) as Chain[]

    for (const chainId of protocolChains) {
      const adapters =
        defiProvider.adaptersController.fetchChainProtocolAdapters(
          chainId,
          protocolId,
        )

      for (const [productId, adapter] of adapters) {
        it(`protocol token addresses are checksumed (${protocolId} # ${productId} # ${ChainIdToChainNameMap[chainId]})`, async () => {
          let protocolTokenAddresses: string[]
          try {
            protocolTokenAddresses = (await adapter.getProtocolTokens()).map(
              (x) => x.address,
            )
          } catch (error) {
            // Skip if adapter does not have protocol tokens
            expect(true).toBeTruthy()
            return
          }

          const invalidAddresses = getInvalidAddresses(protocolTokenAddresses)

          if (invalidAddresses.length > 0) {
            throw new Error(
              `Invalid protocol token addresses found:\n${invalidAddresses.join(
                '\n',
              )}`,
            )
          }

          expect(true).toBeTruthy()
        })
      }
    }

    const positionsTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'positions' } =>
        testCase.method === 'positions',
    )
    if (positionsTestCases.length) {
      describe('getPositions', () => {
        it.each(
          positionsTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'positions for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.getPositions({
              ...testCase.input,
              filterProtocolIds: [protocolId],
              filterProductIds: [productId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(
            `[Integration test] getPositions for ${protocolId} finished`,
          )
        })
      })
    }

    const profitTestCases = testCases.filter(
      (test): test is TestCase & { method: 'profits' } =>
        test.method === 'profits',
    )
    if (profitTestCases.length) {
      describe('getProfits', () => {
        it.each(
          profitTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'profits for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.getProfits({
              ...testCase.input,
              filterProtocolIds: [protocolId],
              filterProductIds: [productId],
              filterChainIds: [testCase.chainId],
              toBlockNumbersOverride: { [testCase.chainId]: blockNumber },
            })

            // Morpho profit test were failing with -0 comparison with 0
            expect(normalizeNegativeZero(response)).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(
            `[Integration test] getProfits for ${protocolId} finished`,
          )
        })
      })
    }

    const depositsTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'deposits' } =>
        testCase.method === 'deposits',
    )
    if (depositsTestCases.length) {
      describe('deposits', () => {
        it.each(
          depositsTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'deposits for test %s match',
          async (_, testCase) => {
            const { snapshot, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.getDeposits({
              ...testCase.input,
              protocolId: protocolId,
              chainId: testCase.chainId,
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(`[Integration test] deposits for ${protocolId} finished`)
        })
      })
    }

    const withdrawalsTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'withdrawals' } =>
        testCase.method === 'withdrawals',
    )
    if (withdrawalsTestCases.length) {
      describe('withdrawals', () => {
        it.each(
          withdrawalsTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'withdrawals for test %s match',
          async (_, testCase) => {
            const { snapshot, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.getWithdrawals({
              ...testCase.input,
              chainId: testCase.chainId,
              protocolId,
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(
            `[Integration test] withdrawals for ${protocolId} finished`,
          )
        })
      })
    }
    const repaysTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'repays' } =>
        testCase.method === 'repays',
    )
    if (repaysTestCases.length) {
      describe('repays', () => {
        it.each(
          repaysTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'repays for test %s match',
          async (_, testCase) => {
            const { snapshot, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.getRepays({
              ...testCase.input,
              protocolId: protocolId,
              chainId: testCase.chainId,
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(`[Integration test] deposits for ${protocolId} finished`)
        })
      })
    }

    const borrowsTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'borrows' } =>
        testCase.method === 'borrows',
    )
    if (borrowsTestCases.length) {
      describe('borrows', () => {
        it.each(
          borrowsTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'withdrawals for test %s match',
          async (_, testCase) => {
            const { snapshot, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.getBorrows({
              ...testCase.input,
              chainId: testCase.chainId,
              protocolId,
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(
            `[Integration test] withdrawals for ${protocolId} finished`,
          )
        })
      })
    }

    const pricesTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'prices' } =>
        testCase.method === 'prices',
    )
    if (pricesTestCases.length) {
      describe('unwrap', () => {
        it.each(
          pricesTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'unwrap for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.unwrap({
              filterProtocolIds: [protocolId],
              filterProductIds: [productId],
              filterChainIds: [testCase.chainId],
              filterProtocolToken: testCase.filterProtocolToken,
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(`[Integration test] unwrap for ${protocolId} finished`)
        })
      })
    }

    const tvlTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'tvl' } =>
        testCase.method === 'tvl',
    )
    if (tvlTestCases.length) {
      describe('getTotalValueLocked', () => {
        it.each(tvlTestCases.map((testCase) => [testKey(testCase), testCase]))(
          'tvl for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.getTotalValueLocked({
              filterProtocolIds: [protocolId],
              filterProductIds: [productId],
              filterChainIds: [testCase.chainId],
              filterProtocolTokens: testCase.filterProtocolTokens,
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(
            `[Integration test] getTotalValueLocked for ${protocolId} finished`,
          )
        })
      })
    }

    const txParamsTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'tx-params' } =>
        testCase.method === 'tx-params',
    )

    if (txParamsTestCases.length) {
      describe('tx-params', () => {
        it.each(
          txParamsTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'tx-params for test %s match',
          async (_, testCase) => {
            const { snapshot, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const inputs = {
              ...testCase.input,
              protocolId,
              chainId: testCase.chainId,
            } as GetTransactionParams

            const response = await defiProvider.getTransactionParams(inputs)

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(`[Integration test] deposits for ${protocolId} finished`)
        })
      })
    }
  })
}

function testKey({ chainId, method, key }: TestCase) {
  return `${ChainIdToChainNameMap[chainId]}.${method}${
    key ? `.${kebabCase(key)}` : ''
  }`
}

async function fetchSnapshot(
  testCase: TestCase,
  protocolId: Protocol,
  productId: string,
) {
  const { snapshot, blockNumber, rpcResponses } = await loadJsonFile(
    testCase,
    protocolId,
    productId,
  )

  return {
    snapshot,
    blockNumber,
    defiProvider: rpcResponses ? defiProvider : defiProviderWithMulticall,
  }
}

async function loadJsonFile(
  testCase: TestCase,
  protocolId: Protocol,
  productId: string,
) {
  const expectedString = await fs.readFile(
    path.resolve(
      __dirname,
      `./${protocolId}/products/${productId}/tests/snapshots/${testKey(
        testCase,
      )}.json`,
    ),
    'utf-8',
  )

  const { snapshot, blockNumber, rpcResponses } = bigintJsonParse(
    expectedString,
  ) as {
    snapshot: unknown
    blockNumber?: number
    rpcResponses?: RpcInterceptedResponse
  }

  return {
    snapshot,
    blockNumber,
    rpcResponses,
  }
}
