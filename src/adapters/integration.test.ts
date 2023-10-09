import { promises as fs } from 'fs'
import path from 'path'
import {
  getPositions,
  getProfits,
  getDeposits,
  getWithdrawals,
  getPrices,
  getTotalValueLocked,
  getApy,
  getApr,
} from '..'
import { ChainName } from '../core/constants/chains'
import { bigintJsonParse, bigintJsonStringify } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { TestCase } from '../types/testCase'
import { testCases as aaveV2TestCases } from './aave-v2/tests/testCases'
import { testCases as exampleTestCases } from './example/tests/testCases'
import { Protocol } from './protocols'
import { testCases as stargateTestCases } from './stargate/tests/testCases'
import { testCases as uniswapV3TestCases } from './uniswap-v3/tests/testCases'

const TEST_TIMEOUT = 10000

runAllTests()

function runAllTests() {
  // runProtocolTests(Protocol.Example, exampleTestCases)
  // runProtocolTests(Protocol.Stargate, stargateTestCases)
  // runProtocolTests(Protocol.AaveV2, aaveV2TestCases)
  runProtocolTests(Protocol.UniswapV3, uniswapV3TestCases)
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

            const response = await getPositions({
              ...testCase.input,
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )
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

            const response = await getProfits({
              ...testCase.input,
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              toBlockNumbersOverride: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )
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

            const response = await getDeposits({
              ...testCase.input,
              protocolId: protocolId,
              chainId: testCase.chainId,
            })
            console.log(bigintJsonStringify(response))
            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )
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

            const response = await getWithdrawals({
              ...testCase.input,
              chainId: testCase.chainId,
              protocolId,
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )
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

            const response = await getPrices({
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )
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

            const response = await getTotalValueLocked({
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )
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

            const response = await getApy({
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )
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

            const response = await getApr({
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )
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
