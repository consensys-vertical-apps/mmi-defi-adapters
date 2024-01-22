import { formatUnits } from 'ethers'
import { priceAdapterConfig } from '../adapters/prices/products/usd/priceAdapterConfig'
import {
  ProfitsWithRange,
  GetEventsInput,
  PositionType,
  TokenType,
  MovementsByBlock,
  ProtocolPosition,
} from '../types/adapter'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import { aggregateFiatBalances } from './utils/aggregateFiatBalances'
import { aggregateFiatBalancesFromMovements } from './utils/aggregateFiatBalancesFromMovements'
import { calculateDeFiAttributionPerformance } from './utils/calculateDeFiAttributionPerformance'

export async function getProfits({
  adapter,
  userAddress,
  fromBlock,
  toBlock,
  protocolTokenAddresses,
}: {
  adapter: IProtocolAdapter
  userAddress: string
  fromBlock: number
  toBlock: number
  protocolTokenAddresses?: string[]
}): Promise<ProfitsWithRange> {
  let endPositionValues: ReturnType<typeof aggregateFiatBalances>,
    startPositionValues: ReturnType<typeof aggregateFiatBalances>

  let rawEndPositionValues: ProtocolPosition[]

  let rawStartPositionValues: ProtocolPosition[]
  if (protocolTokenAddresses) {
    // Call both in parallel with filter
    ;[endPositionValues, startPositionValues] = await Promise.all([
      adapter
        .getPositions({
          userAddress,
          blockNumber: toBlock,
          protocolTokenAddresses,
        })
        .then((result) => {
          rawEndPositionValues = result
          return aggregateFiatBalances(result)
        }),
      adapter
        .getPositions({
          userAddress,
          blockNumber: fromBlock,
          protocolTokenAddresses,
        })
        .then((result) => {
          rawStartPositionValues = result
          return aggregateFiatBalances(result)
        }),
    ])
  } else {
    // Call toBlock first and filter fromBlock
    ;(endPositionValues = await adapter
      .getPositions({
        userAddress,
        blockNumber: toBlock,
      })
      .then((result) => {
        rawEndPositionValues = result
        return aggregateFiatBalances(result)
      })),
      (startPositionValues = await adapter
        .getPositions({
          userAddress,
          blockNumber: fromBlock,
          protocolTokenAddresses: Object.keys(endPositionValues),
        })
        .then((result) => {
          rawStartPositionValues = result
          return aggregateFiatBalances(result)
        }))
  }

  const rawWithdrawals: MovementsByBlock[] = []
  const rawDeposits: MovementsByBlock[] = []

  const tokens = await Promise.all(
    Object.values(endPositionValues).map(async ({ protocolTokenMetadata }) => {
      const getEventsInput: GetEventsInput = {
        userAddress,
        protocolTokenAddress: protocolTokenMetadata.address,
        fromBlock,
        toBlock,
        tokenId: protocolTokenMetadata.tokenId,
      }

      const [withdrawals, deposits] = await Promise.all([
        adapter.getWithdrawals(getEventsInput).then((result) => {
          rawWithdrawals.push(...result)
          return aggregateFiatBalancesFromMovements(result)
        }),
        adapter.getDeposits(getEventsInput).then((result) => {
          rawDeposits.push(...result)
          return aggregateFiatBalancesFromMovements(result)
        }),
      ])

      const key = protocolTokenMetadata.tokenId ?? protocolTokenMetadata.address

      const endPositionValue = +formatUnits(
        endPositionValues[key]?.usdRaw ?? 0n,
        priceAdapterConfig.decimals,
      )
      const withdrawal = +formatUnits(
        withdrawals[key]?.usdRaw ?? 0n,
        priceAdapterConfig.decimals,
      )
      const deposit = +formatUnits(
        deposits[key]?.usdRaw ?? 0n,
        priceAdapterConfig.decimals,
      )
      const startPositionValue = +formatUnits(
        startPositionValues[key]?.usdRaw ?? 0n,
        priceAdapterConfig.decimals,
      )

      const profit =
        endPositionValue + withdrawal - deposit - startPositionValue

      if (adapter.getProtocolDetails().positionType == PositionType.Borrow) {
        profit * -1
      }

      return {
        ...protocolTokenMetadata,
        type: TokenType.Protocol,
        profit: profit,
        performance: calculateDeFiAttributionPerformance({
          profit,
          withdrawal,
          deposit,
          startPositionValue,
        }),
        calculationData: {
          withdrawals: withdrawal,
          deposits: deposit,
          startPositionValue: startPositionValue,
          endPositionValue: endPositionValue,
        },
        rawValues: {
          rawEndPositionValues,
          rawStartPositionValues,
          rawWithdrawals,
          rawDeposits,
        },
      }
    }),
  )

  return { tokens, fromBlock, toBlock }
}
