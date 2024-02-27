import { formatUnits, getAddress } from 'ethers'
import { Erc20__factory } from '../../../contracts'
import { Chain, ChainName } from '../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Erc20Metadata } from '../../../types/erc20Metadata'

export type CurvePoolAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
    lpTokenManager: string
  }
>
export type CurveStakingAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export async function queryCurvePools(
  curveProduct: 'pool' | 'staking' | 'reward',
  chainId: Chain,
  provider: CustomJsonRpcProvider,
): Promise<CurvePoolAdapterMetadata | CurveStakingAdapterMetadata> {
  const minVolumeUSD = 50000
  const minTotalSupply = 100

  const baseUrl = `https://api.curve.fi/v1/getPools/all/${ChainName[chainId]}`

  const results = await (await fetch(`${baseUrl}`)).json()

  if (curveProduct === 'pool') {
    const transformed: CurvePoolAdapterMetadata = {}

    const transformData = async (data: any) => {
      await Promise.all(
        data.data.poolData.map(async (pool: any) => {
          if (pool.usdTotal < minVolumeUSD) {
            return
          }

          if (pool.totalSupply < minTotalSupply) {
            return
          }

          transformed[getAddress(pool.lpTokenAddress)] = {
            protocolToken: await getTokenMetadata(
              pool.lpTokenAddress,
              chainId,
              provider,
            ),
            underlyingTokens: await Promise.all(
              pool.coins.map(
                async (coin: any) =>
                  await getTokenMetadata(coin.address, chainId, provider),
              ),
            ),
            lpTokenManager: pool.address,
          }
        }),
      )

      return transformed
    }

    return transformData(results)
  } else {
    const transformed: CurveStakingAdapterMetadata = {}

    const transformData = async (data: any) => {
      await Promise.all(
        data.data.poolData.map(async (pool: any) => {
          if (!pool.gaugeAddress) {
            return
          }

          if (pool.usdTotal < minVolumeUSD) {
            return
          }

          if (pool.totalSupply < minTotalSupply) {
            return
          }

          const protocolToken = await getTokenMetadata(
            pool.lpTokenAddress,
            chainId,
            provider,
          )

          transformed[getAddress(pool.gaugeAddress)] = {
            protocolToken: {
              ...protocolToken,
              address: getAddress(pool.gaugeAddress),
            },
            underlyingTokens: [protocolToken],
          }
        }),
      )
      return transformed
    }

    return transformData(results)
  }
}
