import { formatUnits } from 'ethers'
import { Erc20__factory } from '../../../contracts'
import { Chain } from '../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { MetaRegistry__factory } from '../contracts'
import { CURVE_META_REGISTRY_CONTRACT } from '../products/pool/curvePoolAdapter'

const LOW_LP_TOKEN_SUPPLY = 1
export async function getPoolData(
  i: number,
  chainId: Chain,
  provider: CustomJsonRpcProvider,
): Promise<
  | {
      protocolToken: Erc20Metadata
      underlyingTokens: Erc20Metadata[]
      poolAddress: string
      stakingToken: string
    }
  | undefined
> {
  const metaRegistryContract = MetaRegistry__factory.connect(
    CURVE_META_REGISTRY_CONTRACT,
    provider,
  )
  const poolAddress = await metaRegistryContract.pool_list(i)
  const lpToken = await metaRegistryContract['get_lp_token(address)'](
    poolAddress,
  )
  const lpTokenContract = Erc20__factory.connect(lpToken, provider)

  const underlyingCoins = (
    await metaRegistryContract['get_underlying_coins(address)'](poolAddress)
  ).filter((address) => address !== ZERO_ADDRESS)

  const [
    { name: poolName, decimals: poolDecimals, symbol: poolSymbol },
    totalSupply,
  ] = await Promise.all([
    getTokenMetadata(lpToken, chainId, provider),
    lpTokenContract.totalSupply(),
  ])

  const totalSupplyFormatted = Number(formatUnits(totalSupply, poolDecimals))

  if (+totalSupplyFormatted < LOW_LP_TOKEN_SUPPLY) {
    return undefined
  }

  const underlyingTokens = await Promise.all(
    underlyingCoins.map((result) =>
      getTokenMetadata(result, Chain.Ethereum, provider),
    ),
  )

  const stakingToken = await metaRegistryContract['get_gauge(address)'](
    poolAddress,
  )

  return {
    protocolToken: {
      name: poolName,
      decimals: Number(poolDecimals),
      symbol: poolSymbol,
      address: lpToken,
    },
    underlyingTokens,
    poolAddress: poolAddress,
    stakingToken,
  }
}
