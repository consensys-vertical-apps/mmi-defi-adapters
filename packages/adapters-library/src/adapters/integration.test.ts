import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ChainName } from '../core/constants/chains'
import { bigintJsonParse } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { DefiProvider } from '../defiProvider'
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
import { testCases as stakeWiseTestCases } from './stakewise/tests/testCases'
import { testCases as stargateTestCases } from './stargate/tests/testCases'
import type { GetTransactionParams } from './supportedProtocols'
import { testCases as sushiswapV2TestCases } from './sushiswap-v2/tests/testCases'
import { testCases as swellTestCases } from './swell/tests/testCases'
import { testCases as syncSwapTestCases } from './syncswap/tests/testCases'
import { testCases as uniswapV2TestCases } from './uniswap-v2/tests/testCases'
import { testCases as uniswapV3TestCases } from './uniswap-v3/tests/testCases'
import { testCases as xfaiTestCases } from './xfai/tests/testCases'

const TEST_TIMEOUT = 300000

const defiProvider = new DefiProvider({ useMulticallInterceptor: true })

runAllTests()

function runAllTests() {
  runProtocolTests(Protocol.AaveV2, aaveV2TestCases)
  runProtocolTests(Protocol.AaveV3, aaveV3TestCases)
  runProtocolTests(Protocol.AngleProtocol, angleProtocolTestCases)
  runProtocolTests(Protocol.CarbonDeFi, carbonDeFiTestCases)
  runProtocolTests(Protocol.ChimpExchange, chimpExchangeTestCases)
  runProtocolTests(Protocol.CompoundV2, compoundV2TestCases)
  runProtocolTests(Protocol.Convex, convexTestCases)
  runProtocolTests(Protocol.Curve, curveTestCases)
  runProtocolTests(Protocol.Ethena, ethenaTestCases)
  runProtocolTests(Protocol.Flux, fluxTestCases)
  runProtocolTests(Protocol.Gmx, gmxTestCases)
  runProtocolTests(Protocol.IZiSwap, iZiSwapTestCases)
  runProtocolTests(Protocol.Lido, lidoTestCases)
  runProtocolTests(Protocol.Maker, makerTestCases)
  runProtocolTests(Protocol.MendiFinance, mendiFinanceTestCases)
  runProtocolTests(Protocol.MorphoAaveV2, morphoAaveV2TestCases)
  runProtocolTests(Protocol.MorphoAaveV3, morphoAaveV3TestCases)
  runProtocolTests(Protocol.MorphoBlue, morphoBlueTestCases)
  runProtocolTests(Protocol.MorphoCompoundV2, morphoCompoundV2TestCases)

  runProtocolTests(Protocol.PancakeswapV2, pancakeswapV2TestCases)
  runProtocolTests(Protocol.PricesV2, pricesV2TestCases)
  runProtocolTests(Protocol.QuickswapV2, quickswapV2TestCases)
  runProtocolTests(Protocol.RocketPool, rocketPoolTestCases)
  runProtocolTests(Protocol.StakeWise, stakeWiseTestCases)
  runProtocolTests(Protocol.Stargate, stargateTestCases)
  runProtocolTests(Protocol.SushiswapV2, sushiswapV2TestCases)
  runProtocolTests(Protocol.Swell, swellTestCases)
  runProtocolTests(Protocol.SyncSwap, syncSwapTestCases)
  runProtocolTests(Protocol.UniswapV2, uniswapV2TestCases)
  runProtocolTests(Protocol.UniswapV3, uniswapV3TestCases)
  runProtocolTests(Protocol.Xfai, xfaiTestCases)
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
