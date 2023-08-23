import { ethers } from 'ethers'
import { Chain } from '../constants/chains'

const provider = (url: string | undefined, chainId: Chain) =>
  url ? new ethers.providers.StaticJsonRpcProvider(url, chainId) : undefined

export const chainProviders: Record<
  Chain,
  ethers.providers.StaticJsonRpcProvider | undefined
> = {
  [Chain.Ethereum]: provider(process.env.ETHEREUM_PROVIDER_URL, Chain.Ethereum),
  [Chain.Optimism]: provider(process.env.OPTIMISM_PROVIDER_URL, Chain.Optimism),
  [Chain.Bsc]: provider(process.env.BSC_PROVIDER_URL, Chain.Bsc),
  [Chain.Polygon]: provider(process.env.POLYGON_PROVIDER_URL, Chain.Polygon),
  [Chain.Fantom]: provider(process.env.FANTOM_PROVIDER_URL, Chain.Fantom),
  [Chain.Arbitrum]: provider(process.env.ARBITRUM_PROVIDER_URL, Chain.Arbitrum),
  [Chain.Avalanche]: provider(
    process.env.AVALANCHE_PROVIDER_URL,
    Chain.Avalanche,
  ),
  [Chain.Linea]: provider(process.env.LINEA_PROVIDER_URL, Chain.Linea),
  [Chain.Base]: provider(process.env.BASE_PROVIDER_URL, Chain.Base),
}
