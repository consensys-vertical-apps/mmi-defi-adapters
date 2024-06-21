import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Chain, ChainName } from '../core/constants/chains'
import { bigintJsonParse } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { DefiProvider } from '../defiProvider'
import { getMetadataInvalidAddresses } from '../scripts/addressValidation'
import { protocolFilter } from '../scripts/commandFilters'
import { TestCase } from '../types/testCase'
import { testCases as aaveV2TestCases } from './aave-v2/tests/testCases'
import { testCases as aaveV3TestCases } from './aave-v3/tests/testCases'
import { testCases as angleProtocolTestCases } from './angle-protocol/tests/testCases'
import { testCases as carbonDeFiTestCases } from './carbon-defi/tests/testCases'
import { testCases as chimpExchangeTestCases } from './chimp-exchange/tests/testCases'
import { testCases as compoundV2TestCases } from './compound-v2/tests/testCases'
import { testCases as convexTestCases } from './convex/tests/testCases'
import { testCases as curveTestCases } from './curve/tests/testCases'
import { testCases as ethenaTestCases } from './ethena/tests/testCases'
import { testCases as fluxTestCases } from './flux/tests/testCases'
import { testCases as gmxTestCases } from './gmx/tests/testCases'
import { testCases as iZiSwapTestCases } from './iziswap/tests/testCases'
import { testCases as lidoTestCases } from './lido/tests/testCases'
import { testCases as makerTestCases } from './maker/tests/testCases'
import { testCases as mendiFinanceTestCases } from './mendi-finance/tests/testCases'
import { testCases as morphoAaveV2TestCases } from './morpho-aave-v2/tests/testCases'
import { testCases as morphoAaveV3TestCases } from './morpho-aave-v3/tests/testCases'
import { testCases as morphoBlueTestCases } from './morpho-blue/tests/testCases'
import { testCases as morphoCompoundV2TestCases } from './morpho-compound-v2/tests/testCases'
import { testCases as pancakeswapV2TestCases } from './pancakeswap-v2/tests/testCases'
import { testCases as pricesV2TestCases } from './prices-v2/tests/testCases'
import { Protocol } from './protocols'
import { testCases as quickswapV2TestCases } from './quickswap-v2/tests/testCases'
import { testCases as rocketPoolTestCases } from './rocket-pool/tests/testCases'
import { testCases as sonneTestCases } from './sonne/tests/testCases'
import { testCases as stakeWiseTestCases } from './stakewise/tests/testCases'
import { testCases as stargateTestCases } from './stargate/tests/testCases'
import {
  type GetTransactionParams,
  supportedProtocols,
} from './supportedProtocols'
import { testCases as sushiswapV2TestCases } from './sushiswap-v2/tests/testCases'
import { testCases as swellTestCases } from './swell/tests/testCases'
import { testCases as syncSwapTestCases } from './syncswap/tests/testCases'
import { testCases as uniswapV2TestCases } from './uniswap-v2/tests/testCases'
import { testCases as uniswapV3TestCases } from './uniswap-v3/tests/testCases'
import { testCases as xfaiTestCases } from './xfai/tests/testCases'

import { testCases as lynexTestCases } from './lynex/tests/testCases'
import { testCases as pendleTestCases } from './pendle/tests/testCases'

const TEST_TIMEOUT = 300000

const defiProvider = new DefiProvider({ useMulticallInterceptor: true })

const filterProtocolId = protocolFilter(
  process.env.DEFI_ADAPTERS_TEST_FILTER_PROTOCOL,
)

const protocolTestCases = {
  [Protocol.AaveV2]: aaveV2TestCases,
  [Protocol.AaveV3]: aaveV3TestCases,
  [Protocol.AngleProtocol]: angleProtocolTestCases,
  [Protocol.CarbonDeFi]: carbonDeFiTestCases,
  [Protocol.ChimpExchange]: chimpExchangeTestCases,
  [Protocol.CompoundV2]: compoundV2TestCases,
  [Protocol.Convex]: convexTestCases,
  [Protocol.Curve]: curveTestCases,
  [Protocol.Ethena]: ethenaTestCases,
  [Protocol.Flux]: fluxTestCases,
  [Protocol.Gmx]: gmxTestCases,
  [Protocol.IZiSwap]: iZiSwapTestCases,
  [Protocol.Lido]: lidoTestCases,
  [Protocol.Lynex]: lynexTestCases,
  [Protocol.Maker]: makerTestCases,
  [Protocol.MendiFinance]: mendiFinanceTestCases,
  [Protocol.MorphoAaveV2]: morphoAaveV2TestCases,
  [Protocol.MorphoAaveV3]: morphoAaveV3TestCases,
  [Protocol.MorphoBlue]: morphoBlueTestCases,
  [Protocol.MorphoCompoundV2]: morphoCompoundV2TestCases,
  [Protocol.PancakeswapV2]: pancakeswapV2TestCases,
  [Protocol.Pendle]: pendleTestCases,
  [Protocol.PricesV2]: pricesV2TestCases,
  [Protocol.QuickswapV2]: quickswapV2TestCases,
  [Protocol.RocketPool]: rocketPoolTestCases,
  [Protocol.Sonne]: sonneTestCases,
  [Protocol.StakeWise]: stakeWiseTestCases,
  [Protocol.Stargate]: stargateTestCases,
  [Protocol.SushiswapV2]: sushiswapV2TestCases,
  [Protocol.Swell]: swellTestCases,
  [Protocol.SyncSwap]: syncSwapTestCases,
  [Protocol.UniswapV2]: uniswapV2TestCases,
  [Protocol.UniswapV3]: uniswapV3TestCases,
  [Protocol.Xfai]: xfaiTestCases,
}

runAllTests()

function runAllTests() {
  if (filterProtocolId) {
    runProtocolTests(filterProtocolId, protocolTestCases[filterProtocolId])
    return
  }

  for (const [protocolId, testCases] of Object.entries(protocolTestCases) as [
    Protocol,
    TestCase[],
  ][]) {
    runProtocolTests(protocolId, testCases)
  }
}

function runProtocolTests(protocolId: Protocol, testCases: TestCase[]) {
  describe(protocolId, () => {
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
        it(`protocol token addresses are checksumed (${protocolId} # ${productId} # ${ChainName[chainId]})`, async () => {
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

          const invalidAddresses = getMetadataInvalidAddresses(
            protocolTokenAddresses,
          )

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
            const { snapshot, blockNumber } = await fetchSnapshot(
              testCase,
              protocolId,
            )

            const response = await defiProvider.getPositions({
              ...testCase.input,
              filterProtocolIds: [protocolId],
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
            const { snapshot, blockNumber } = await fetchSnapshot(
              testCase,
              protocolId,
            )

            const response = await defiProvider.getProfits({
              ...testCase.input,
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              toBlockNumbersOverride: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
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
            const { snapshot } = await fetchSnapshot(testCase, protocolId)

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
            const { snapshot } = await fetchSnapshot(testCase, protocolId)

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
            const { snapshot } = await fetchSnapshot(testCase, protocolId)

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
            const { snapshot } = await fetchSnapshot(testCase, protocolId)

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
            const { snapshot, blockNumber } = await fetchSnapshot(
              testCase,
              protocolId,
            )

            const response = await defiProvider.unwrap({
              filterProtocolIds: [protocolId],
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
            const { snapshot, blockNumber } = await fetchSnapshot(
              testCase,
              protocolId,
            )

            const response = await defiProvider.getTotalValueLocked({
              filterProtocolIds: [protocolId],
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
            const { snapshot } = await fetchSnapshot(testCase, protocolId)

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
  return `${ChainName[chainId]}.${method}${key ? `.${kebabCase(key)}` : ''}`
}

async function fetchSnapshot(testCase: TestCase, protocolId: Protocol) {
  const expectedString = await fs.readFile(
    path.resolve(
      __dirname,
      `./${protocolId}/tests/snapshots/${testKey(testCase)}.json`,
    ),
    'utf-8',
  )

  return bigintJsonParse(expectedString) as {
    // biome-ignore lint/suspicious/noExplicitAny: Type could be narrower
    snapshot: any
    blockNumber?: number
  }
}
