import type { Chain } from '../../../core/constants/chains.js'
import type { AssetResponseEntity, MarketsResponseEntity } from './types.js'

const PENDLE_BACKEND_URL = (chainId: Chain) =>
  `https://api-v2.pendle.finance/core/v1/${chainId}`

export async function fetchAllMarkets(chainId: Chain) {
  const skip = 0
  const limit = 100
  const resp = await fetch(
    `${PENDLE_BACKEND_URL(
      chainId,
    )}/markets?order_by=name%3A1&skip=${skip}&limit=${limit}`,
  )
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const data: MarketsResponseEntity = (await resp.json()) as any
  return data
}

export async function fetchAllAssets(chainId: Chain) {
  const resp = await fetch(`${PENDLE_BACKEND_URL(chainId)}/assets/all`)
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const data: AssetResponseEntity[] = (await resp.json()) as any
  return data
}
