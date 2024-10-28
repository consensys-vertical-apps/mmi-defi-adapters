import { Chain } from '../../../core/constants/chains'
import {
  AssetResponseEntity,
  MarketAltEntity,
  MarketsResponseEntity,
} from './types'

const PENDLE_BACKEND_URL = (chainId: Chain) =>
  `https://api-v2.pendle.finance/core/v1/${chainId}`

export async function fetchAllMarkets(chainId: Chain) {
  let allMarkets: MarketAltEntity[] = []
  let skip = 0
  const limit = 100
  let total = 0
  let hasMore = true

  while (hasMore) {
    const resp = await fetch(
      `${PENDLE_BACKEND_URL(
        chainId,
      )}/markets?order_by=name%3A1&skip=${skip}&limit=${limit}`,
    )

    const data: MarketsResponseEntity = await resp.json()

    if (data.results && data.results.length > 0) {
      allMarkets = allMarkets.concat(data.results)
      skip += data.limit
      total = data.total

      // If the results fetched are fewer than the limit, we know we have all the data.
      if (data?.results?.length < limit) {
        hasMore = false
      }
    }
  }

  return {
    total,
    limit,
    skip,
    results: allMarkets,
  }
}

export async function fetchAllAssets(chainId: Chain) {
  const resp = await fetch(`${PENDLE_BACKEND_URL(chainId)}/assets/all`)
  const data: AssetResponseEntity[] = await resp.json()
  return data
}
