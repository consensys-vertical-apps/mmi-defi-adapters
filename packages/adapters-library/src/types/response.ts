import type { Protocol } from '../adapters/protocols'
import type { Chain, ChainName } from '../core/constants/chains'
import { ProtocolToken } from './IProtocolAdapter'
import type {
  AdapterSettings,
  ProtocolDetails,
  ProtocolPosition,
  TokenBalanceWithUnderlyings,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrappedTokenExchangeRate,
} from './adapter'

export type AdapterErrorResponse = {
  error: {
    message: string
    // biome-ignore lint/suspicious/noExplicitAny: We don't know the type
    details?: any
  }
}

export type AdapterResponse<ProtocolResponse> = ProtocolDetails & {
  chainName: ChainName
  protocolDisplayName: string
} & (
    | (ProtocolResponse & { success: true })
    | (AdapterErrorResponse & { success: false })
  )

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

export type PricePerShareResponse = AdapterResponse<{
  tokens: DisplayUnwrapExchangeRate[]
}>

export type DisplayUnwrapExchangeRate = Omit<UnwrapExchangeRate, 'tokens'> & {
  tokens?: (UnwrappedTokenExchangeRate & {
    underlyingRate: number
    iconUrl?: string
  })[]
}

export type Support = Partial<
  Record<
    Protocol,
    {
      protocolDetails: ProtocolDetails
      chains: Chain[]
      protocolTokenAddresses?: Partial<Record<Chain, string[]>>
      protocolTokens?: Partial<Record<Chain, ProtocolToken[]>>
      userEvent: AdapterSettings['userEvent']
    }[]
  >
>
