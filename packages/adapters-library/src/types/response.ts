import type { Protocol } from '../adapters/protocols'
import type { Chain, ChainName } from '../core/constants/chains'
import type {
  MovementsByBlock,
  ProfitsWithRange,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenBalanceWithUnderlyings,
  TokenTvl,
  TokenType,
  Underlying,
  UnderlyingTokenTvl,
  UnwrapExchangeRate,
  UnwrappedTokenExchangeRate,
} from './adapter'
import { ProtocolToken } from './IProtocolAdapter'
import { WriteActions } from './writeActions'

export type GetEventsRequestInput = {
  userAddress: string
  fromBlock: number
  toBlock: number
  protocolTokenAddress: string
  protocolId: Protocol
  chainId: Chain
  productId: string
  tokenId?: string
}

export type AdapterErrorResponse = {
  error: {
    message: string
    // biome-ignore lint/suspicious/noExplicitAny: We don't know the type
    details?: any
  }
}

export type AdapterResponse<ProtocolResponse> =
  | (ProtocolDetails & {
      chainName: ChainName
    } & (
        | (ProtocolResponse & { success: true })
        | (AdapterErrorResponse & { success: false })
      ))
  | (AdapterErrorResponse & { success: false })

export type DefiPositionResponse = AdapterResponse<{
  tokens: DisplayPosition<ProtocolPosition>[]
}>

export type DisplayPosition<
  PositionBalance extends TokenBalanceWithUnderlyings & {
    type: TokenType
  },
> = Omit<PositionBalance, 'tokens'> & {
  balance: number
  tokens?: DisplayPosition<Underlying>[]
  price: number
  priceRaw: never
} & (PositionBalance['type'] extends
    | typeof TokenType.Underlying
    | typeof TokenType.UnderlyingClaimable
    ? { iconUrl: string }
    : Record<string, never>)

export type DefiProfitsResponse = AdapterResponse<ProfitsWithRange>

export type PricePerShareResponse = AdapterResponse<{
  tokens: DisplayUnwrapExchangeRate[]
}>

export type DisplayUnwrapExchangeRate = Omit<UnwrapExchangeRate, 'tokens'> & {
  tokens?: (UnwrappedTokenExchangeRate & {
    underlyingRate: number
    iconUrl?: string
  })[]
}

export type TotalValueLockResponse = AdapterResponse<{
  tokens: DisplayTokenTvl<DisplayProtocolTokenTvl>[]
}>

export type DisplayProtocolTokenTvl = Omit<ProtocolTokenTvl, 'tokens'> & {
  totalSupply: number
  tokens?: (UnderlyingTokenTvl & { totalSupply: number; iconUrl: string })[]
}

export type DisplayTokenTvl<
  TokenTvlBalance extends TokenTvl & {
    type: TokenType
    tokens?: UnderlyingTokenTvl[]
  },
> = Omit<TokenTvlBalance, 'tokens'> & {
  totalSupply: number
  tokens?: DisplayTokenTvl<UnderlyingTokenTvl>[]
  price: number
  priceRaw: never
} & (TokenTvlBalance['type'] extends typeof TokenType.Underlying
    ? { iconUrl: string }
    : Record<string, never>)

export type DefiMovementsResponse = AdapterResponse<{
  movements: DisplayMovementsByBlock[]
}>

export type DisplayMovementsByBlock = Omit<MovementsByBlock, 'tokens'> & {
  tokens?: (Underlying & { balance: number })[]
}

export type Support = Partial<
  Record<
    Protocol,
    {
      protocolDetails: ProtocolDetails
      chains: Chain[]
      protocolTokenAddresses?: Partial<Record<Chain, string[]>>
      writeActions?: WriteActions[]
      protocolTokens?: Partial<Record<Chain, ProtocolToken[]>>
    }[]
  >
>
