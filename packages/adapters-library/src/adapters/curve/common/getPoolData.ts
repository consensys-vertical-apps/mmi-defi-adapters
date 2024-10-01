import { Chain, ChainName } from '../../../core/constants/chains'
import { logger } from '../../../core/utils/logger'
import { Protocol } from '../../protocols'
import { filterMapAsync } from '../../../core/utils/filters'

export async function getCurvePoolData(chainId: Chain, productId: string) {
  const minVolumeUSD = 50000
  const minTotalSupply = 100n

  const endpointUrl = `https://api.curve.fi/v1/getPools/all/${ChainName[chainId]}`

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
