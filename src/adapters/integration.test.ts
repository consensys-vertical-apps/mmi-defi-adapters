import { promises as fs } from 'fs'
import path from 'path'
import {
  getPositions,
  getTodaysProfits,
  getDeposits,
  getWithdrawals,
  getPrices,
} from '..'
import { ChainName } from '../core/constants/chains'
import { bigintJsonParse } from '../core/utils/bigint-json'
import { TestCase } from './testCase'
import { Protocol } from '.'

const TEN_SECONDS = 10000
jest.setTimeout(TEN_SECONDS)

export function runProtocolTests(protocolId: Protocol, testCases: TestCase[]) {
  describe(protocolId, () => {
    describe('getPositions', () => {
      it.each(
        testCases
          .filter(
            (testCase): testCase is TestCase & { method: 'positions' } =>
              testCase.method === 'positions',
          )
          .map((testCase) => [testKey(testCase), testCase]),
      )('positions for test %s match', async (_, testCase) => {
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
      })
    })

    describe('getProfits', () => {
      it.each(
        testCases
          .filter(
            (test): test is TestCase & { method: 'profits' } =>
              test.method === 'profits',
          )
          .map((testCase) => [testKey(testCase), testCase]),
      )('profits for test %s match', async (_, testCase) => {
        const { snapshot, blockNumber } = await fetchSnapshot(
          testCase,
          protocolId,
        )

        const response = await getTodaysProfits({
          ...testCase.input,
          filterProtocolIds: [protocolId],
          filterChainIds: [testCase.chainId],
          blockNumbers: { [testCase.chainId]: blockNumber },
        })

        expect(response).toEqual(snapshot)
      })
    })

    describe('deposits', () => {
      it.each(
        testCases
          .filter(
            (test): test is TestCase & { method: 'deposits' } =>
              test.method === 'deposits',
          )
          .map((testCase) => [testKey(testCase), testCase]),
      )('deposits for test %s match', async (_, testCase) => {
        const { snapshot } = await fetchSnapshot(testCase, protocolId)

        const response = await getDeposits({
          ...testCase.input,
          filterProtocolIds: [protocolId],
          filterChainIds: [testCase.chainId],
        })

        expect(response).toEqual(snapshot)
      })
    })

    describe('withdrawals', () => {
      it.each(
        testCases
          .filter(
            (test): test is TestCase & { method: 'withdrawals' } =>
              test.method === 'withdrawals',
          )
          .map((testCase) => [testKey(testCase), testCase]),
      )('withdrawals for test %s match', async (_, testCase) => {
        const { snapshot } = await fetchSnapshot(testCase, protocolId)

        const response = await getWithdrawals({
          ...testCase.input,
          filterProtocolIds: [protocolId],
          filterChainIds: [testCase.chainId],
        })

        expect(response).toEqual(snapshot)
      })
    })

    describe('getPrices', () => {
      it.each(
        testCases
          .filter(
            (test): test is TestCase & { method: 'prices' } =>
              test.method === 'prices',
          )
          .map((testCase) => [testKey(testCase), testCase]),
      )('prices for test %s match', async (_, testCase) => {
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
      })
    })
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
