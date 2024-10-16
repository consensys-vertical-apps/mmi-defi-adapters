import { formatUnits } from 'ethers'
import { priceAdapterConfig } from '../adapters/prices-v2/products/usd/priceV2Config.js'
import { enrichMovements, enrichPositionBalance } from '../responseAdapters.js'
import type { IProtocolAdapter } from '../types/IProtocolAdapter.js'
import {
  type AggregatedFiatBalances,
  type GetEventsInput,
  type MovementsByBlock,
  PositionType,
  type ProfitsWithRange,
  type ProtocolPosition,
  TokenType,
} from '../types/adapter.js'
import type { IUnwrapCache } from '../unwrapCache.js'
import { aggregateFiatBalances } from './utils/aggregateFiatBalances.js'
import { aggregateFiatBalancesFromMovements } from './utils/aggregateFiatBalancesFromMovements.js'
import { calculateDeFiAttributionPerformance } from './utils/calculateDeFiAttributionPerformance.js'
import { unwrap } from './utils/unwrap.js'

export async function getProfits({
  adapter,
  userAddress,
  fromBlock,
  toBlock,
  protocolTokenAddresses,
  tokenIds,
  includeRawValues,
  unwrapCache,
}: {
  adapter: IProtocolAdapter
  userAddress: string
  fromBlock: number
  toBlock: number
  protocolTokenAddresses?: string[]
  tokenIds?: string[]
  includeRawValues?: boolean
  unwrapCache: IUnwrapCache
}): Promise<ProfitsWithRange> {
  let endPositionValues: ReturnType<typeof aggregateFiatBalances>
  let startPositionValues: ReturnType<typeof aggregateFiatBalances>

  let rawEndPositionValues: ProtocolPosition[]

  let rawStartPositionValues: ProtocolPosition[]

  if (protocolTokenAddresses ?? tokenIds) {
    // Call both in parallel with filter
    ;[endPositionValues, startPositionValues] = await Promise.all([
      adapter
        .getPositions({
          userAddress,
          blockNumber: toBlock,
          protocolTokenAddresses,
          tokenIds,
        })
        .then(async (result) => {
          await unwrap(adapter, toBlock, result, 'balanceRaw', unwrapCache)
          return result
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
          tokenIds,
        })
        .then(async (result) => {
          await unwrap(adapter, fromBlock, result, 'balanceRaw', unwrapCache)
          return result
        })
        .then((result) => {
          rawStartPositionValues = result
          return aggregateFiatBalances(result)
        }),
    ])
  } else {
    // Call toBlock first and filter fromBlock
    endPositionValues = await adapter
      .getPositions({
        userAddress,
        blockNumber: toBlock,
      })
      .then(async (result) => {
        await unwrap(adapter, toBlock, result, 'balanceRaw', unwrapCache)
        return result
      })
      .then((result) => {
        rawEndPositionValues = result
        return aggregateFiatBalances(result)
      })

    startPositionValues = await adapter
      .getPositions({
        userAddress,
        blockNumber: fromBlock,
        protocolTokenAddresses: Object.keys(endPositionValues), // endPositionValues is indexed by tokenId ?? protocolTokenAddress
        tokenIds: Object.keys(endPositionValues), // endPositionValues is indexed by tokenId ?? protocolTokenAddress
      })
      .then(async (result) => {
        await unwrap(adapter, fromBlock, result, 'balanceRaw', unwrapCache)
        return result
      })
      .then((result) => {
        rawStartPositionValues = result
        return aggregateFiatBalances(result)
      })
  }

  const rawWithdrawals: MovementsByBlock[] = []
  const rawDeposits: MovementsByBlock[] = []
  const rawRepays: MovementsByBlock[] = []
  const rawBorrows: MovementsByBlock[] = []

  const tokens = await Promise.all(
    Object.values(endPositionValues).map(async ({ protocolTokenMetadata }) => {
      const getEventsInput: GetEventsInput = {
        userAddress,
        protocolTokenAddress: protocolTokenMetadata.address,
        fromBlock,
        toBlock,
        tokenId: protocolTokenMetadata.tokenId,
      }

      const isBorrow =
        adapter.getProtocolDetails().positionType === PositionType.Borrow

      // Borrow adapters only have: repays and borrows
      // All other types have withdrawals and deposits only
      const [withdrawals, deposits, repays, borrows] = await Promise.all([
        !isBorrow
          ? adapter
              .getWithdrawals(getEventsInput)
              .then(async (result) => {
                await Promise.all(
                  result.map(async (positionMovements) => {
                    return await unwrap(
                      adapter,
                      positionMovements.blockNumber,
                      positionMovements.tokens,
                      'balanceRaw',
                      unwrapCache,
                    )
                  }),
                )
                return result
              })
              .then((result) => {
                rawWithdrawals.push(...result)
                return aggregateFiatBalancesFromMovements(result)
              })
          : ({} as AggregatedFiatBalances),
        !isBorrow
          ? adapter
              .getDeposits(getEventsInput)
              .then(async (result) => {
                await Promise.all(
                  result.map(async (positionMovements) => {
                    return await unwrap(
                      adapter,
                      positionMovements.blockNumber,
                      positionMovements.tokens,
                      'balanceRaw',
                      unwrapCache,
                    )
                  }),
                )
                return result
              })
              .then((result) => {
                rawDeposits.push(...result)
                return aggregateFiatBalancesFromMovements(result)
              })
          : ({} as AggregatedFiatBalances),
        isBorrow
          ? adapter
              .getRepays?.(getEventsInput)
              .then(async (result) => {
                await Promise.all(
                  result.map(async (positionMovements) => {
                    return await unwrap(
                      adapter,
                      positionMovements.blockNumber,
                      positionMovements.tokens,
                      'balanceRaw',
                      unwrapCache,
                    )
                  }),
                )
                return result
              })
              .then((result) => {
                rawRepays.push(...result)
                return aggregateFiatBalancesFromMovements(result)
              })
          : ({} as AggregatedFiatBalances),
        isBorrow
          ? adapter
              .getBorrows?.(getEventsInput)
              .then(async (result) => {
                await Promise.all(
                  result.map(async (positionMovements) => {
                    return await unwrap(
                      adapter,
                      positionMovements.blockNumber,
                      positionMovements.tokens,
                      'balanceRaw',
                      unwrapCache,
                    )
                  }),
                )
                return result
              })
              .then((result) => {
                rawBorrows.push(...result)
                return aggregateFiatBalancesFromMovements(result)
              })
          : ({} as AggregatedFiatBalances),
      ])

      const key = protocolTokenMetadata.tokenId ?? protocolTokenMetadata.address

      // Format units only if there is a price adapter for the chain
      const formatUnitsIfPossible = (value: bigint | undefined) => {
        if (
          value &&
          priceAdapterConfig[adapter.chainId as keyof typeof priceAdapterConfig]
        ) {
          return +formatUnits(
            value,
            priceAdapterConfig[
              adapter.chainId as keyof typeof priceAdapterConfig
            ].decimals,
          )
        }
        return 0
      }

      const endPositionValue = formatUnitsIfPossible(
        endPositionValues[key]?.usdRaw,
      )
      const withdrawal = formatUnitsIfPossible(withdrawals[key]?.usdRaw)
      const deposit = formatUnitsIfPossible(deposits[key]?.usdRaw)
      const repay = formatUnitsIfPossible(repays?.[key]?.usdRaw)
      const borrow = formatUnitsIfPossible(borrows?.[key]?.usdRaw)

      const startPositionValue = formatUnitsIfPossible(
        startPositionValues[key]?.usdRaw,
      )

      const profitModifier = isBorrow ? -1 : 1

      const profit =
        (endPositionValue +
          withdrawal +
          repay -
          deposit -
          borrow -
          startPositionValue) *
        profitModifier

      const hasTokensWithoutUSDPrices =
        startPositionValues[key]?.hasTokensWithoutUSDPrices ||
        endPositionValues[key]?.hasTokensWithoutUSDPrices ||
        deposits[key]?.hasTokensWithoutUSDPrices ||
        withdrawals[key]?.hasTokensWithoutUSDPrices

      const tokensWithoutUSDPrices = hasTokensWithoutUSDPrices
        ? [
            ...(startPositionValues[key]?.tokensWithoutUSDPrices ?? []),
            ...(endPositionValues[key]?.tokensWithoutUSDPrices ?? []),
            ...(deposits[key]?.tokensWithoutUSDPrices ?? []),
            ...(withdrawals[key]?.tokensWithoutUSDPrices ?? []),
          ]
        : undefined

      return {
        ...protocolTokenMetadata,
        type: TokenType.Protocol,
        profit,
        performance: calculateDeFiAttributionPerformance({
          profit,
          withdrawal,
          deposit,
          startPositionValue,
        }),
        calculationData: {
          withdrawals: withdrawal,
          deposits: deposit,
          repays: repay,
          borrows: borrow,
          startPositionValue: startPositionValue * profitModifier,
          endPositionValue: endPositionValue * profitModifier,
          hasTokensWithoutUSDPrices: hasTokensWithoutUSDPrices ?? undefined,
          tokensWithoutUSDPrices,
        },
        rawValues: includeRawValues
          ? {
              rawEndPositionValues: rawEndPositionValues.map(
                (protocolPosition) =>
                  enrichPositionBalance(protocolPosition, adapter.chainId),
              ),
              rawStartPositionValues: rawStartPositionValues.map(
                (protocolPosition) =>
                  enrichPositionBalance(protocolPosition, adapter.chainId),
              ),
              rawWithdrawals: rawWithdrawals.map((value) =>
                enrichMovements(value, adapter.chainId),
              ),
              rawDeposits: rawDeposits.map((value) =>
                enrichMovements(value, adapter.chainId),
              ),
              rawRepays: rawRepays.map((value) =>
                enrichMovements(value, adapter.chainId),
              ),
              rawBorrows: rawBorrows.map((value) =>
                enrichMovements(value, adapter.chainId),
              ),
            }
          : undefined,
      }
    }),
  )

  return { tokens, fromBlock, toBlock }
}
