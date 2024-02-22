import { promises as fs } from 'fs'
import path from 'path'
import { ChainName } from '../core/constants/chains'
import { bigintJsonParse } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { DefiProvider } from '../defiProvider'
import { TestCase } from '../types/testCase'
import { testCases as aaveV2TestCases } from './aave-v2/tests/testCases'
import { testCases as aaveV3TestCases } from './aave-v3/tests/testCases'
import { testCases as carbonDeFiTestCases } from './carbon-defi/tests/testCases'
import { testCases as chimpExchangeTestCases } from './chimp-exchange/tests/testCases'
import { testCases as compoundTestCases } from './compound/tests/testCases'
import { testCases as convexTestCases } from './convex/tests/testCases'
import { testCases as curveTestCases } from './curve/tests/testCases'
import { testCases as gMXTestCases } from './gmx/tests/testCases'
import { testCases as iZiSwapTestCases } from './iziswap/tests/testCases'
import { testCases as lidoTestCases } from './lido/tests/testCases'
import { testCases as makerTestCases } from './maker/tests/testCases'
import { testCases as mendiFinanceTestCases } from './mendi-finance/tests/testCases'
import { testCases as morphoAaveV2TestCases } from './morpho-aave-v2/tests/testCases'
import { testCases as morphoAaveV3ETHOptimizerTestCases } from './morpho-aave-v3-eth/tests/testCases'
import { testCases as morphoCompoundV2OptimizerTestCases } from './morpho-compound-v2/tests/testCases'
import { testCases as pricesV2TestCases } from './prices-v2/tests/testCases'
import { Protocol } from './protocols'
import { testCases as rocketPoolTestCases } from './rocket-pool/tests/testCases'
import { testCases as stargateTestCases } from './stargate/tests/testCases'
import { testCases as swellTestCases } from './swell/tests/testCases'
import { testCases as syncSwapTestCases } from './syncswap/tests/testCases'
import { testCases as uniswapV3TestCases } from './uniswap-v3/tests/testCases'

const TEST_TIMEOUT = 300000

const defiProvider = new DefiProvider({ useMulticallInterceptor: true })

runAllTests()

function runAllTests() {
  runProtocolTests(Protocol.Stargate, stargateTestCases)
  runProtocolTests(Protocol.AaveV2, aaveV2TestCases)
  runProtocolTests(Protocol.AaveV3, aaveV3TestCases)
  runProtocolTests(Protocol.UniswapV3, uniswapV3TestCases)
  runProtocolTests(Protocol.Lido, lidoTestCases)
  runProtocolTests(Protocol.Curve, curveTestCases)
  runProtocolTests(Protocol.Compound, compoundTestCases)
  runProtocolTests(Protocol.Maker, makerTestCases)
  runProtocolTests(Protocol.GMX, gMXTestCases)
  runProtocolTests(Protocol.Swell, swellTestCases)
  runProtocolTests(Protocol.MorphoAaveV2, morphoAaveV2TestCases)
  runProtocolTests(Protocol.Convex, convexTestCases)
  runProtocolTests(
    Protocol.MorphoCompoundV2,
    morphoCompoundV2OptimizerTestCases,
  )
  runProtocolTests(
    Protocol.MorphoAaveV3ETHOptimizer,
    morphoAaveV3ETHOptimizerTestCases,
  )
  runProtocolTests(Protocol.SyncSwap, syncSwapTestCases)
  runProtocolTests(Protocol.IZiSwap, iZiSwapTestCases)
  runProtocolTests(Protocol.ChimpExchange, chimpExchangeTestCases)
  runProtocolTests(Protocol.MendiFinance, mendiFinanceTestCases)
  runProtocolTests(Protocol.CarbonDeFi, carbonDeFiTestCases)
  runProtocolTests(Protocol.RocketPool, rocketPoolTestCases)
  runProtocolTests(Protocol.PricesV2, pricesV2TestCases)
}

function runProtocolTests(protocolId: Protocol, testCases: TestCase[]) {
  describe(protocolId, () => {
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
      describe('getPrices', () => {
        it.each(
          pricesTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'prices for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber } = await fetchSnapshot(
              testCase,
              protocolId,
            )

            const response = await defiProvider.getPrices({
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
          logger.debug(
            `[Integration test] getPrices for ${protocolId} finished`,
          )
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

    const apyTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'apy' } =>
        testCase.method === 'apy',
    )
    if (apyTestCases.length) {
      describe('getApy', () => {
        it.each(apyTestCases.map((testCase) => [testKey(testCase), testCase]))(
          'apy for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber } = await fetchSnapshot(
              testCase,
              protocolId,
            )

            const response = await defiProvider.getApy({
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(`[Integration test] getApy for ${protocolId} finished`)
        })
      })
    }

    const aprTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'apr' } =>
        testCase.method === 'apr',
    )
    if (aprTestCases.length) {
      describe('getApr', () => {
        it.each(aprTestCases.map((testCase) => [testKey(testCase), testCase]))(
          'apr for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber } = await fetchSnapshot(
              testCase,
              protocolId,
            )

            const response = await defiProvider.getApr({
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(`[Integration test] getApr for ${protocolId} finished`)
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

            const response = await defiProvider.getTransactionParams({
              ...testCase.input,
              protocolId,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshot: any
    blockNumber?: number
  }
}
