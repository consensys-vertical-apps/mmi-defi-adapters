import { formatUnits } from '@ethersproject/units'
import {
  GetEventsInput,
  GetPositionsInput,
  GetProfitsInput,
  MovementsByBlock,
  ProfitsTokensWithRange,
  ProtocolToken,
  TokenType,
} from '../../types/adapter'
import { AVERAGE_BLOCKS_PER_DAY } from '../constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain } from '../constants/chains'
import { aggregateTrades } from './aggregateTrades'
import { calculateProfit } from './calculateProfit'
import { formatProtocolTokenArrayToMap } from './protocolTokenToMap'

type GetOneDayProfitInput = GetProfitsInput & {
  chainId: Chain
  getPositions: (input: GetPositionsInput) => Promise<ProtocolToken[]>
  getWithdrawals: (input: GetEventsInput) => Promise<MovementsByBlock[]>
  getDeposits: (input: GetEventsInput) => Promise<MovementsByBlock[]>
}

export async function getOneDayProfit({
  userAddress,
  blockNumber,
  chainId,
  getPositions,
  getWithdrawals,
  getDeposits,
}: GetOneDayProfitInput): Promise<ProfitsTokensWithRange> {
  const toBlock = blockNumber
  const fromBlock = toBlock - AVERAGE_BLOCKS_PER_DAY[chainId]

  const [currentValues, previousValues] = await Promise.all([
    getPositions({
      userAddress,
      blockNumber: toBlock,
    }).then(formatProtocolTokenArrayToMap),
    getPositions({
      userAddress,
      blockNumber: fromBlock,
    }).then(formatProtocolTokenArrayToMap),
  ])

  const tokens = await Promise.all(
    Object.values(currentValues).map(
      async ({ protocolTokenMetadata, underlyingTokenPositions }) => {
        const getEventsInput: GetEventsInput = {
          userAddress,
          protocolTokenAddress: protocolTokenMetadata.address,
          fromBlock,
          toBlock,
        }

        const [withdrawals, deposits] = await Promise.all([
          getWithdrawals(getEventsInput).then(aggregateTrades),
          getDeposits(getEventsInput).then(aggregateTrades),
        ])

        const profits = calculateProfit({
          deposits,
          withdrawals,
          currentValues: underlyingTokenPositions,
          previousVales:
            previousValues[protocolTokenMetadata.address]
              ?.underlyingTokenPositions ?? {},
        })

        return {
          ...protocolTokenMetadata,
          type: TokenType.Protocol,
          tokens: Object.values(underlyingTokenPositions).map(
            (underlyingToken) => {
              return {
                ...underlyingToken,
                profitRaw: profits[underlyingToken.address]!,
                profit: formatUnits(
                  profits[underlyingToken.address]!,
                  underlyingToken.decimals,
                ),
                type: TokenType.Underlying,
              }
            },
          ),
        }
      },
    ),
  )

  return { tokens, fromBlock, toBlock }
}
