import { ethers, getAddress } from 'ethers'
import { Chain, ChainName } from '../../../core/constants/chains'
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
    protocolToken: Erc20Metadata & { guageType: GaugeType }
    underlyingTokens: Erc20Metadata[]
  }
>

export async function queryCurvePools(
  chainId: Chain,
  provider: CustomJsonRpcProvider,
): Promise<CurvePoolAdapterMetadata> {
  const minVolumeUSD = 50000
  const minTotalSupply = 100

  const baseUrl = `https://api.curve.fi/v1/getPools/all/${ChainName[chainId]}`

  const results = await (await fetch(`${baseUrl}`)).json()

  const transformed: CurvePoolAdapterMetadata = {}

  // eslint-disable-next-line
  const transformData = async (data: any) => {
    await Promise.all(
      // eslint-disable-next-line
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
              // eslint-disable-next-line
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
}
export async function queryCurveGauges(
  chainId: Chain,
  provider: CustomJsonRpcProvider,
): Promise<CurveStakingAdapterMetadata> {
  const minVolumeUSD = 50000
  const minTotalSupply = 100

  const baseUrl = `https://api.curve.fi/v1/getPools/all/${ChainName[chainId]}`

  const results = await (await fetch(`${baseUrl}`)).json()

  const transformed: CurveStakingAdapterMetadata = {}

  // eslint-disable-next-line
  const transformData = async (data: any) => {
    await Promise.all(
      // eslint-disable-next-line
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
            guageType: await resolveGaugeType(pool.gaugeAddress, provider),
          },
          underlyingTokens: [protocolToken],
        }
      }),
    )
    return transformed
  }

  return transformData(results)
}

export enum GaugeType {
  SINGLE = 'single',
  DOUBLE = 'double',
  N_GAUGE = 'n-gauge',
  GAUGE_V4 = 'gauge-v4',
  CHILD = 'child-chain',
  REWARDS_ONLY = 'rewards-only',
}

async function resolveGaugeType(
  gaugeAddress: string,
  provider: CustomJsonRpcProvider,
): Promise<GaugeType> {
  let bytecode = await provider.getCode(gaugeAddress)
  const minimalProxyMatch =
    /0x363d3d373d3d3d363d73(.*)5af43d82803e903d91602b57fd5bf3/.exec(bytecode)
  if (minimalProxyMatch)
    bytecode = await provider.getCode(`0x${minimalProxyMatch[1]}`)

  const doubleGaugeMethod = ethers.id('rewarded_token()').slice(2, 10)
  const nGaugeMethod = ethers.id('reward_tokens(uint256)').slice(2, 10)
  const gaugeV4Method = ethers
    .id('claimable_reward_write(address,address)')
    .slice(2, 10)

  if (bytecode.includes(gaugeV4Method)) return GaugeType.GAUGE_V4
  if (bytecode.includes(nGaugeMethod)) return GaugeType.N_GAUGE
  if (bytecode.includes(doubleGaugeMethod)) return GaugeType.DOUBLE
  return GaugeType.SINGLE
}
