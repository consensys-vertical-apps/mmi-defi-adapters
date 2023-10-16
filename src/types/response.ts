import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import {
  MovementsByBlock,
  ProfitsWithRange,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolDetails,
  ProtocolTokenUnderlyingRate,
  ProtocolPosition,
  ProtocolTokenTvl,
  Underlying,
  UnderlyingTokenRate,
  PositionProfits,
  UnderlyingProfitValues,
  BaseTokenMovement,
  UnderlyingTokenTvl,
  TokenType,
  TokenBalance,
} from './adapter'

export type GetEventsRequestInput = {
  userAddress: string
  fromBlock: number
  toBlock: number
  protocolTokenAddress: string
  protocolId: Protocol
  chainId: Chain
  product: string
  tokenId?: string
}

export type AdapterErrorResponse = {
  error: {
    message: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any
  }
}

export type AdapterResponse<ProtocolResponse> =
  | (ProtocolDetails &
      (
        | (ProtocolResponse & { success: true })
        | (AdapterErrorResponse & { success: false })
      ))
  | (AdapterErrorResponse & { success: false })

export type DefiPositionResponse = AdapterResponse<{
  tokens: DisplayPosition<ProtocolPosition>[]
}>

export type DisplayPosition<
  PositionBalance extends TokenBalance & {
    type: TokenType
    tokens?: Underlying[]
  },
> = Omit<PositionBalance, 'tokens'> & {
  balance: string
  tokens?: DisplayPosition<Underlying>[]
} & (PositionBalance['type'] extends
    | typeof TokenType.Underlying
    | typeof TokenType.UnderlyingClaimableFee
    ? { iconUrl: string }
    : Record<string, never>)

export type DefiProfitsResponse = AdapterResponse<DisplayProfitsWithRange>

export type DisplayProfitsWithRange = Omit<ProfitsWithRange, 'tokens'> & {
  tokens: DisplayPositionProfits[]
}

type DisplayPositionProfits = Omit<PositionProfits, 'tokens'> & {
  tokens: (UnderlyingProfitValues & { profit: string; iconUrl: string })[]
}

export type PricePerShareResponse = AdapterResponse<{
  tokens: DisplayProtocolTokenUnderlyingRate[]
}>

export type DisplayProtocolTokenUnderlyingRate = Omit<
  ProtocolTokenUnderlyingRate,
  'tokens'
> & {
  tokens?: (UnderlyingTokenRate & { underlyingRate: string; iconUrl: string })[]
}

export type APRResponse = AdapterResponse<{
  tokens: ProtocolTokenApr[]
}>

export type APYResponse = AdapterResponse<{
  tokens: ProtocolTokenApy[]
}>

export type TotalValueLockResponse = AdapterResponse<{
  tokens: DisplayProtocolTokenTvl[]
}>

export type DisplayProtocolTokenTvl = Omit<ProtocolTokenTvl, 'tokens'> & {
  totalSupply: string
  tokens?: (UnderlyingTokenTvl & { totalSupply: string; iconUrl: string })[]
}

export type DefiMovementsResponse = AdapterResponse<{
  movements: DisplayMovementsByBlock[]
}>

export type DisplayMovementsByBlock = Omit<
  MovementsByBlock,
  'underlyingTokensMovement'
> & {
  underlyingTokensMovement: Record<
    string,
    BaseTokenMovement & { movementValue: string }
  >
}
