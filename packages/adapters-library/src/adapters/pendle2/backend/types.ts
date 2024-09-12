export interface ValuationEntity {
  usd?: number | null
  acc?: number | null
}

export interface AssetEntity {
  id: string
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  /** @format date-time */
  expiry?: string | null
  accentColor?: string | null
  price?: ValuationEntity | null
  /** @format date-time */
  priceUpdatedAt?: string | null
  baseType: string
  types: string[]
  protocol?: string | null
  underlyingPool?: string | null
  simpleName?: string | null
  simpleSymbol?: string | null
  simpleIcon?: string | null
  proName?: string | null
  proSymbol?: string | null
  proIcon?: string | null
  zappable?: boolean | null
}

export interface MarketAltEntity {
  id: string
  chainId: number
  address: string
  name: string
  symbol: string
  /** @format date-time */
  expiry: string
  pt: AssetEntity
  yt: AssetEntity
  sy: AssetEntity
  lp: AssetEntity
  accountingAsset: AssetEntity
  underlyingAsset: AssetEntity
  basePricingAsset?: AssetEntity | null
  protocol?: string | null
  underlyingPool?: string | null
  simpleName?: string | null
  simpleSymbol?: string | null
  simpleIcon?: string | null
  proName?: string | null
  proSymbol?: string | null
  proIcon?: string | null
  farmName?: string | null
  farmSymbol?: string | null
  farmSimpleName?: string | null
  farmSimpleSymbol?: string | null
  farmSimpleIcon?: string | null
  farmProName?: string | null
  farmProSymbol?: string | null
  farmProIcon?: string | null
  assetRepresentation: string
  isWhitelistedPro: boolean
  isWhitelistedSimple: boolean
  votable: boolean
  isActive: boolean
  isWhitelistedLimitOrder: boolean
  accentColor?: string | null
  totalPt?: number | null
  totalSy?: number | null
  totalLp?: number | null
  liquidity?: ValuationEntity | null
  tradingVolume?: ValuationEntity | null
  underlyingInterestApy?: number | null
  underlyingRewardApy?: number | null
  underlyingApy?: number | null
  impliedApy?: number | null
  ytFloatingApy?: number | null
  ptDiscount?: number | null
  swapFeeApy?: number | null
  pendleApy?: number | null
  arbApy?: number | null
  aggregatedApy?: number | null
  maxBoostedApy?: number | null
  lpRewardApy?: number | null
  voterApy?: number | null
  /** @format date-time */
  dataUpdatedAt?: string | null
  categoryIds: string[]
  /** @format date-time */
  timestamp: string
  scalarRoot: number
  initialAnchor: number
}

export interface MarketsResponseEntity {
  total: number
  limit: number
  skip: number
  results: MarketAltEntity[]
}

export interface AssetResponseEntity {
  id: string
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  /** @format date-time */
  expiry?: string | null
  accentColor?: string | null
  price?: ValuationEntity | null
  /** @format date-time */
  priceUpdatedAt?: string | null
  baseType: string
  types: string[]
  protocol?: string | null
  underlyingPool?: string | null
  simpleName?: string | null
  simpleSymbol?: string | null
  simpleIcon?: string | null
  proName?: string | null
  proSymbol?: string | null
  proIcon?: string | null
  zappable?: boolean | null
}
