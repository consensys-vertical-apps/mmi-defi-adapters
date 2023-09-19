import { promises as fs } from 'fs'
import path from 'path'
import { Protocol } from '../..'
import { Chain, ChainName } from '../../../core/constants/chains'
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
          (test): test is TestCase & { method: 'positions' } =>
            test.method === 'positions',
        )
        .map((test) => [test.id, test.chainId, test.method, test.input]),
    )('positions match: %s', async (id, chainId, method, input) => {
      const { snapshot, blockNumber } = await fetchSnapshot(chainId, method, id)

      const response = await getPositions({
        ...input,
        filterProtocolIds: [Protocol.Stargate],
        filterChainIds: [chainId],
        blockNumbers: { [chainId]: blockNumber },
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
        .map((test) => [test.id, test.chainId, test.method, test.input]),
    )('profits match: %s', async (id, chainId, method, input) => {
      const { snapshot, blockNumber } = await fetchSnapshot(chainId, method, id)

      const response = await getTodaysProfits({
        ...input,
        filterProtocolIds: [Protocol.Stargate],
        filterChainIds: [chainId],
        blockNumbers: { [chainId]: blockNumber },
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
        .map((test) => [test.id, test.chainId, test.method, test.input]),
    )('deposits match: %s', async (id, chainId, method, input) => {
      const { snapshot } = await fetchSnapshot(chainId, method, id)

      const response = await getDeposits({
        ...input,
        filterProtocolIds: [Protocol.Stargate],
        filterChainIds: [chainId],
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
        .map((test) => [test.id, test.chainId, test.method, test.input]),
    )('withdrawals match: %s', async (id, chainId, method, input) => {
      const { snapshot } = await fetchSnapshot(chainId, method, id)

      const response = await getWithdrawals({
        ...input,
        filterProtocolIds: [Protocol.Stargate],
        filterChainIds: [chainId],
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
        .map((test) => [test.id, test.chainId, test.method]),
    )('prices match: %s', async (id, chainId, method) => {
      const { snapshot, blockNumber } = await fetchSnapshot(chainId, method, id)

      const response = await getPrices({
        filterProtocolIds: [Protocol.Stargate],
        filterChainIds: [chainId],
        blockNumbers: { [chainId]: blockNumber },
      })

      expect(response).toEqual(snapshot)
    })
  })
})

async function fetchSnapshot(chainId: Chain, method: string, id: string) {
  const expectedString = await fs.readFile(
    path.resolve(
      __dirname,
      `./snapshots/${ChainName[chainId]}.${method}.${id}.json`,
    ),
    'utf-8',
  )

  return bigintJsonParse(expectedString) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshot: any
    blockNumber?: number
  }
}
