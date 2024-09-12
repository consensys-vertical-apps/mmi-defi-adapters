export interface MarketParams {
  loanToken: string
  collateralToken: string
  oracle: string
  irm: string
  lltv: bigint
}

export interface MarketData {
  totalSupplyAssets: bigint
  totalSupplyShares: bigint
  totalBorrowAssets: bigint
  totalBorrowShares: bigint
  lastUpdate: bigint
  fee: bigint
}

export interface PositionUser {
  supplyShares: bigint
  borrowShares: bigint
  collateral: bigint
}
