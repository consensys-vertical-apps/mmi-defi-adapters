import { promises as fs } from 'fs'
import path from 'path'
import {
  getPositions,
  getProfits,
  getDeposits,
  getWithdrawals,
  getPrices,
} from '..'
import { ChainName } from '../core/constants/chains'
import { bigintJsonParse } from '../core/utils/bigint-json'
import { testCases } from './stargate/tests/testCases'
import { TestCase } from './testCase'
import { Protocol } from '.'

const TEST_TIMEOUT = 10000

runProtocolTests(Protocol.Stargate, testCases)

export function runProtocolTests(protocolId: Protocol, testCases: TestCase[]) {
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
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
            })

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
              filterProtocolIds: [protocolId],
              filterChainIds: [testCase.chainId],
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
  })
}

function testKey({ chainId, method, key }: TestCase) {
  return `${ChainName[chainId]}.${method}${key ? `.${key}` : ''}`
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
