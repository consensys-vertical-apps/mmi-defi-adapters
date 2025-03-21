import { Chain } from '../../../core/constants/chains'
import { filterMapAsync } from '../../../core/utils/filters'
import { logger } from '../../../core/utils/logger'
import { Protocol } from '../../protocols'

const CurveChainNames = {
  [Chain.Ethereum]: 'ethereum',
  [Chain.Optimism]: 'optimism',
  [Chain.Polygon]: 'polygon',
  [Chain.Base]: 'base',
  [Chain.Arbitrum]: 'arbitrum',
  [Chain.Avalanche]: 'avalanche',
} as Partial<Record<Chain, string>>

export async function getCurvePoolData(chainId: Chain, productId: string) {
  const minVolumeUSD = 50000
  const minTotalSupply = 100n

  const chainName = CurveChainNames[chainId]

  if (!chainName) {
    throw new Error('Unsupported chain in Curve API')
  }

  const endpointUrl = `https://api.curve.fi/v1/getPools/all/${chainName}`

  const results = (await (await fetch(endpointUrl)).json()) as {
    success: boolean
    data: {
      poolData: {
        usdTotal: number
        totalSupply: string
        lpTokenAddress: string
        coins: { address: string }[]
        address: string
        gaugeAddress: string
      }[]
    }
  }

  if (results.success === false) {
    logger.error(
      {
        protocolId: Protocol.Curve,
        productId,
        chainId,
        url: endpointUrl,
      },
      'Failed to fetch curve pool data',
    )
    throw new Error('Failed to fetch curve pool data')
  }

  return await filterMapAsync(results.data.poolData, async (pool) => {
    if (pool.usdTotal < minVolumeUSD) {
      return
    }

    if (BigInt(pool.totalSupply) < minTotalSupply) {
      return
    }

    return {
      address: pool.address,
      lpTokenAddress: pool.lpTokenAddress,
      coins: pool.coins,
      gaugeAddress: pool.gaugeAddress,
    }
  })
}
