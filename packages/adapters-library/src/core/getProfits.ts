import { formatUnits } from 'ethers'
import { priceAdapterConfig } from '../adapters/prices-v2/products/usd/priceV2Config'
import { enrichMovements, enrichPositionBalance } from '../responseAdapters'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import {
  AggregatedFiatBalances,
  GetEventsInput,
  MovementsByBlock,
  PositionType,
  ProfitsWithRange,
  ProtocolPosition,
  TokenBalanceWithUnderlyings,
  TokenType,
} from '../types/adapter'
import { IUnwrapPriceCache } from '../unwrapCache'
import { createApyCalculatorFor } from './apy-calculators/helpers'
import { aggregateFiatBalances } from './utils/aggregateFiatBalances'
import { aggregateFiatBalancesFromMovements } from './utils/aggregateFiatBalancesFromMovements'
import { calculateDeFiAttributionPerformance } from './utils/calculateDeFiAttributionPerformance'
import { unwrap } from './utils/unwrap'

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
  unwrapCache: IUnwrapPriceCache
}): Promise<ProfitsWithRange> {
  let endPositionValues: AggregatedFiatBalances
  let startPositionValues: AggregatedFiatBalances

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
      const { address, tokenId } = protocolTokenMetadata

      const getEventsInput: GetEventsInput = {
        userAddress,
        protocolTokenAddress: address,
        fromBlock,
        toBlock,
        tokenId,
      }

      const isBorrow =
        adapter.getProtocolDetails().positionType === PositionType.Borrow

      // Borrow adapters only have: repays and borrows
      // All other types have withdrawals and deposits only
      const [
        withdrawalMovements,
        depositMovements,
        repayMovements,
        borrowMovements,
      ] = await Promise.all([
        !isBorrow ? adapter.getWithdrawals(getEventsInput) : [],
        !isBorrow ? adapter.getDeposits(getEventsInput) : [],
        isBorrow ? adapter.getRepays?.(getEventsInput) ?? [] : [],
        isBorrow ? adapter.getBorrows?.(getEventsInput) ?? [] : [],
      ])

      const movementsUnwrapper = unwrapMovements(adapter, unwrapCache)

      const [
        withdrawalMovementsUnwrapped,
        depositMovementsUnwrapped,
        repayMovementsUnwrapped,
        borrowMovementsUnwrapped,
      ] = await Promise.all([
        movementsUnwrapper(withdrawalMovements),
        movementsUnwrapper(depositMovements),
        movementsUnwrapper(repayMovements),
        movementsUnwrapper(borrowMovements),
      ])

      rawWithdrawals.push(...withdrawalMovementsUnwrapped)
      rawDeposits.push(...depositMovementsUnwrapped)
      rawRepays.push(...repayMovementsUnwrapped)
      rawBorrows.push(...borrowMovementsUnwrapped)

      const withdrawals = aggregateFiatBalancesFromMovements(
        withdrawalMovementsUnwrapped,
      )
      const deposits = aggregateFiatBalancesFromMovements(
        depositMovementsUnwrapped,
      )
      const repays = aggregateFiatBalancesFromMovements(repayMovementsUnwrapped)
      const borrows = aggregateFiatBalancesFromMovements(
        borrowMovementsUnwrapped,
      )

      const key = tokenId ?? address

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

      const apyCalculator = await createApyCalculatorFor(adapter, address)

      // Function that finds the token with passed address and tokenId in any array of tokens
      const tokenFinder = findByAddressAndTokenId<TokenBalanceWithUnderlyings>(
        address,
        tokenId,
      )

      const protocolTokenStart = tokenFinder(rawStartPositionValues)!
      const protocolTokenEnd = tokenFinder(rawEndPositionValues)!

      const apyInfo = await apyCalculator.getApy({
        protocolTokenStart,
        protocolTokenEnd,
        blocknumberStart: fromBlock,
        blocknumberEnd: toBlock,
        protocolTokenAddress: address,
        chainId: adapter.chainId,
        withdrawals: withdrawalMovementsUnwrapped,
        deposits: depositMovementsUnwrapped,
        repays: repayMovementsUnwrapped,
        borrows: borrowMovementsUnwrapped,
      })

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
        apyInfo,
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

type WithAddressAndTokenId = { address: string; tokenId?: string }

/**
 * Finds an item in an array of objects that match the provided address and tokenId.
 *
 * @template T - The type of objects in the array, which must include `address` and `tokenId` properties.
 * @param {string} address - The address to match.
 * @param {string} tokenId - The tokenId to match.
 * @param {T[]} array - The array of objects to search through.
 * @returns {T | undefined} The first object that matches the given address and tokenId, or `undefined` if no match is found.
 */
const findByAddressAndTokenId =
  <T extends WithAddressAndTokenId>(address: string, tokenId?: string) =>
  (array: T[]) =>
    array.find((item) => item.address === address && item.tokenId === tokenId)

/**
 * Higher-order function that returns another function to unwrap token movements.
 *
 * The returned function accepts an array of movements by block and unwraps them
 * using a provided protocol adapter and cache.
 *
 * @param {IProtocolAdapter} adapter - The protocol adapter used to interact with and unwrap token balances.
 * @param {IUnwrapCache} unwrapCache - The cache used to store unwrapped token data to avoid redundant operations.
 * @returns {(movementsByBlock: MovementsByBlock[]) => Promise<MovementsByBlock[]>}
 *   A function that accepts an array of movements by block and returns a promise resolving to the unwrapped movements.
 *
 * @async
 * @param {MovementsByBlock[]} movementsByBlock - The array of token movements by block number.
 * @returns {Promise<MovementsByBlock[]>} A promise that resolves to the same array of movements with tokens unwrapped.
 */
const unwrapMovements =
  (adapter: IProtocolAdapter, unwrapCache: IUnwrapPriceCache) =>
  async (movementsByBlock: MovementsByBlock[]): Promise<MovementsByBlock[]> => {
    await Promise.all(
      movementsByBlock.map(async (positionMovements) => {
        return await unwrap(
          adapter,
          positionMovements.blockNumber,
          positionMovements.tokens,
          'balanceRaw',
          unwrapCache,
        )
      }),
    )
    return movementsByBlock
  }
