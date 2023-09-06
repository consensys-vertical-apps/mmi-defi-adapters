import { formatUnits } from 'ethers/lib/utils'
import { Erc20, TransferEvent } from '../../contracts/Erc20'
import {
  BaseTokenMovement,
  GetPricesInput,
  MovementsByBlock,
  ProtocolPricePerShareToken,
} from '../../types/adapter'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { ERC20Metadata } from './getTokenMetadata'

type GetMovementsInput = {
  userAddress: string
  fromBlock: number
  toBlock: number
  protocolToken: ERC20Metadata
  underlyingTokens: ERC20Metadata[]
  protocolTokenContract: Erc20
  getPricePerShare: (
    input: GetPricesInput,
  ) => Promise<ProtocolPricePerShareToken>
}

export function getDeposits({
  protocolToken,
  underlyingTokens,
  protocolTokenContract,
  userAddress,
  fromBlock,
  toBlock,
  getPricePerShare,
}: GetMovementsInput): Promise<MovementsByBlock[]> {
  return getMovements({
    protocolToken,
    underlyingTokens,
    protocolTokenContract,
    fromBlock,
    toBlock,
    getPricePerShare,
    from: ZERO_ADDRESS,
    to: userAddress,
  })
}

export function getWithdrawals({
  protocolToken,
  underlyingTokens,
  protocolTokenContract,
  userAddress,
  fromBlock,
  toBlock,
  getPricePerShare,
}: GetMovementsInput): Promise<MovementsByBlock[]> {
  return getMovements({
    protocolToken,
    underlyingTokens,
    protocolTokenContract,
    fromBlock,
    toBlock,
    getPricePerShare,
    from: userAddress,
    to: ZERO_ADDRESS,
  })
}

async function getMovements({
  protocolToken,
  underlyingTokens,
  protocolTokenContract,
  fromBlock,
  toBlock,
  getPricePerShare,
  from,
  to,
}: Omit<GetMovementsInput, 'userAddress'> & {
  from: string
  to: string
}): Promise<MovementsByBlock[]> {
  const filter = protocolTokenContract.filters.Transfer(from, to)

  const eventResults = await protocolTokenContract.queryFilter<TransferEvent>(
    filter,
    fromBlock,
    toBlock,
  )

  return await buildMovementsByBlock({
    protocolToken,
    underlyingTokens,
    eventResults,
    getPricePerShare,
  })
}

async function buildMovementsByBlock({
  protocolToken,
  underlyingTokens,
  eventResults,
  getPricePerShare,
}: {
  protocolToken: ERC20Metadata
  underlyingTokens: ERC20Metadata[]
  eventResults: TransferEvent[]
  getPricePerShare: (
    input: GetPricesInput,
  ) => Promise<ProtocolPricePerShareToken>
}): Promise<MovementsByBlock[]> {
  return await Promise.all(
    eventResults.map(async (transferEvent) => {
      const {
        blockNumber,
        args: { value },
      } = transferEvent

      const protocolTokenPrice = await getPricePerShare({
        blockNumber,
        protocolTokenAddress: protocolToken.address,
      })

      const pricePerShareRaw = protocolTokenPrice.tokens?.[0]?.pricePerShareRaw
      if (!pricePerShareRaw) {
        throw new Error('No price for events at this time')
      }

      const movementValueRaw = BigInt(value.toString()) * pricePerShareRaw
      return {
        underlyingTokensMovement: buildUnderlyingTokensMovement({
          underlyingTokens,
          movementValueRaw,
        }),
        blockNumber,
      }
    }),
  )
}

function buildUnderlyingTokensMovement({
  underlyingTokens,
  movementValueRaw,
}: {
  underlyingTokens: ERC20Metadata[]
  movementValueRaw: bigint
}): Record<string, BaseTokenMovement> {
  return underlyingTokens.reduce(
    (accummulator, currentToken) => {
      return {
        ...accummulator,
        [currentToken.address]: {
          ...currentToken,
          movementValueRaw,
          movementValue: formatUnits(movementValueRaw, currentToken.decimals),
        },
      }
    },
    {} as Record<string, BaseTokenMovement>,
  )
}
