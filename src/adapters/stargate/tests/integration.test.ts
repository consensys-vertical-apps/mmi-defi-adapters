import { promises as fs } from 'fs'
import path from 'path'
import { Protocol } from '../..'
import { ChainName } from '../../../core/constants/chains'
import { bigintJsonParse } from '../../../core/utils/bigint-json'
import {
  getDeposits,
  getPositions,
  getPrices,
  getTodaysProfits,
  getWithdrawals,
} from '../../../index'
import { TestCase } from '../../test'
import { testCases } from './tests'

const TEN_SECONDS = 10000
jest.setTimeout(TEN_SECONDS)

describe('stargate', () => {
  describe('getPositions', () => {
    it.each(
      testCases
        .filter(
          (testCase): testCase is TestCase & { method: 'positions' } =>
            testCase.method === 'positions',
        )
        .map((testCase) => [testKey(testCase), testCase]),
    )('positions for test %s match', async (_, testCase) => {
      const { snapshot, blockNumber } = await fetchSnapshot(testCase)

      const response = await getPositions({
        ...testCase.input,
        filterProtocolIds: [Protocol.Stargate],
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
      const { snapshot, blockNumber } = await fetchSnapshot(testCase)

      const response = await getTodaysProfits({
        ...testCase.input,
        filterProtocolIds: [Protocol.Stargate],
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
      const { snapshot } = await fetchSnapshot(testCase)

      const response = await getDeposits({
        ...testCase.input,
        filterProtocolIds: [Protocol.Stargate],
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
      const { snapshot } = await fetchSnapshot(testCase)

      const response = await getWithdrawals({
        ...testCase.input,
        filterProtocolIds: [Protocol.Stargate],
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
      const { snapshot, blockNumber } = await fetchSnapshot(testCase)

      const response = await getPrices({
        filterProtocolIds: [Protocol.Stargate],
        filterChainIds: [testCase.chainId],
        blockNumbers: { [testCase.chainId]: blockNumber },
      })

      expect(response).toEqual(snapshot)
    })
  })
})

function testKey({ chainId, method, key }: TestCase) {
  return `${ChainName[chainId]}.${method}${key ? `.${key}` : ''}`
}

async function fetchSnapshot(testCase: TestCase) {
  const expectedString = await fs.readFile(
    path.resolve(__dirname, `./snapshots/${testKey(testCase)}.json`),
    'utf-8',
  )

  return bigintJsonParse(expectedString) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshot: any
    blockNumber?: number
  }
}
