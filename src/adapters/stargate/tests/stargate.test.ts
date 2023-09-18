import 'dotenv/config'
import { promises as fs } from 'fs'
import path from 'path'
import { Protocol } from '../..'
import { Chain } from '../../../core/constants/chains'
import { bigintJsonParse } from '../../../core/utils/bigint-json'
import {
  getDeposits,
  getPositions,
  getPrices,
  getTodaysProfits,
  getWithdrawals,
} from '../../../index'

const TEN_SECONDS = 10000
jest.setTimeout(TEN_SECONDS)

const positionTests = [
  {
    id: 'positions.ethereum',
    input: {
      userAddress: '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
      blockNumber: 18163124,
      filterProtocolIds: [Protocol.Stargate],
      filterChainIds: [Chain.Ethereum],
    },
  },
]

const profitsTests = [
  {
    id: 'profits.ethereum',
    input: {
      userAddress: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
      blockNumber: 18163965,
      filterProtocolIds: [Protocol.Stargate],
      filterChainIds: [Chain.Ethereum],
    },
  },
]

const depositsTests = [
  {
    id: 'deposits.ethereum',
    input: {
      userAddress: '0x2C5D4A0943e9cF4C597a76464396B0bF84C24C45',
      fromBlock: 17719334,
      toBlock: 17719336,
      filterProtocolIds: [Protocol.Stargate],
      filterChainIds: [Chain.Ethereum],
    },
  },
]

const withdrawalsTests = [
  {
    id: 'withdrawals.ethereum',
    input: {
      userAddress: '0x4Ffc5F22770ab6046c8D66DABAe3A9CD1E7A03e7',
      fromBlock: 17979753,
      toBlock: 17979755,
      filterProtocolIds: [Protocol.Stargate],
      filterChainIds: [Chain.Ethereum],
    },
  },
]

const pricesTests = [
  {
    id: 'prices.ethereum',
    input: {
      blockNumber: 18163124,
      filterProtocolIds: [Protocol.Stargate],
      filterChainIds: [Chain.Ethereum],
    },
  },
]

describe('stargate', () => {
  describe('getPositions', () => {
    it.each(positionTests.map((test) => [test.id, test.input]))(
      'positions match: %s',
      async (
        id: string,
        input: {
          userAddress: string
          blockNumber: number
          filterProtocolIds?: Protocol[]
          filterChainIds?: Chain[]
        },
      ) => {
        const response = await getPositions(input)

        const expected = await fethResults(id)
        expect(response).toEqual(expected)
      },
    )
  })

  describe('getTodaysProfits', () => {
    it.each(profitsTests.map((test) => [test.id, test.input]))(
      'one day profits match: %s',
      async (
        id: string,
        input: {
          userAddress: string
          blockNumber: number
          filterProtocolIds?: Protocol[]
          filterChainIds?: Chain[]
        },
      ) => {
        const response = await getTodaysProfits(input)

        const expected = await fethResults(id)
        expect(response).toEqual(expected)
      },
    )
  })

  describe('deposits', () => {
    it.each(depositsTests.map((test) => [test.id, test.input]))(
      'deposits match: %s',
      async (
        id: string,
        input: {
          userAddress: string
          fromBlock: number
          toBlock: number
          filterProtocolIds?: Protocol[]
          filterChainIds?: Chain[]
        },
      ) => {
        const response = await getDeposits(input)

        const expected = await fethResults(id)
        expect(response).toEqual(expected)
      },
    )
  })

  describe('withdrawals', () => {
    it.each(withdrawalsTests.map((test) => [test.id, test.input]))(
      'withdrawals match: %s',
      async (
        id: string,
        input: {
          userAddress: string
          fromBlock: number
          toBlock: number
          filterProtocolIds?: Protocol[]
          filterChainIds?: Chain[]
        },
      ) => {
        const response = await getWithdrawals(input)

        const expected = await fethResults(id)
        expect(response).toEqual(expected)
      },
    )
  })

  describe('getPrices', () => {
    it.each(pricesTests.map((test) => [test.id, test.input]))(
      'prices match: %s',
      async (
        id: string,
        input: {
          blockNumber: number
          filterProtocolIds?: Protocol[]
          filterChainIds?: Chain[]
        },
      ) => {
        const response = await getPrices(input)

        const expected = await fethResults(id)
        expect(response).toEqual(expected)
      },
    )
  })
})

async function fethResults(id: string) {
  const expectedString = await fs.readFile(
    path.resolve(__dirname, `./${id}.json`),
    'utf-8',
  )
  return bigintJsonParse(expectedString)
}
