import { getAddress } from 'ethers'
import { Protocol } from '../../adapters/protocols'
import { E_ADDRESS } from '../constants/E_ADDRESS'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { Chain } from '../constants/chains'
import { logger } from './logger'
import { nativeToken } from './nativeTokens'

// names are here https://github.com/trustwallet/assets/tree/master/blockchains
const chainNameMap: Record<Chain, string> = {
  [Chain.Avalanche]: 'avalanchec',
  [Chain.Polygon]: 'polygon',
  [Chain.Optimism]: 'optimism',
  [Chain.Arbitrum]: 'arbitrum',
  [Chain.Ethereum]: 'ethereum',
  [Chain.Bsc]: 'binance',
  [Chain.Fantom]: 'fantom',
  [Chain.Sei]: 'sei',
  [Chain.Base]: 'base',
  [Chain.Linea]: 'linea',
  [Chain.Solana]: 'solana',
}

export function buildTrustAssetIconUrl(
  chainId: Chain,
  smartContractAddress: string,
) {
  try {
    const address =
      chainId === Chain.Solana
        ? smartContractAddress
        : getAddress(smartContractAddress)

    const chainName = chainNameMap[chainId]

    if (
      [ZERO_ADDRESS, E_ADDRESS, nativeToken[Chain.Solana].address].includes(
        address,
      )
    ) {
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/info/logo.png`
    }

    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${address}/logo.png`
  } catch (error) {
    logger.error(`Error while building icon for ${smartContractAddress}`)
    return ''
  }
}

export const TrustWalletProtocolIconMap: Partial<Record<Protocol, string>> = {
  [Protocol.AaveV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/aave.com.png',
  [Protocol.AaveV3]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/aave.com.png',
  [Protocol.AngleProtocol]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/angle.money.png',
  [Protocol.BalancerV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/balancer.exchange.png',
  [Protocol.Beefy]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.beefy.finance.png',
  [Protocol.CompoundV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/compound.finance.png',
  [Protocol.CompoundV3]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/compound.finance.png',
  [Protocol.Convex]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/www.convexfinance.com.png',
  [Protocol.Curve]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/curve.fi.png',
  [Protocol.Gmx]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/gmx.io.png',
  [Protocol.GmxV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/gmx.io.png',
  [Protocol.Jito]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/www.jito.network.png',
  [Protocol.Lido]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/lido.fi.png',
  [Protocol.Maker]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/makerdao.com.png',
  [Protocol.MorphoAaveV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.morpho.org.png',
  [Protocol.MorphoAaveV3]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.morpho.org.png',
  [Protocol.MorphoBlue]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.morpho.org.png',
  [Protocol.MorphoCompoundV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.morpho.org.png',
  [Protocol.PancakeswapV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/pancakeswap.finance.png',
  [Protocol.Pendle]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/pendle.finance.png',
  [Protocol.QuickswapV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/quickswap.exchange.png',
  [Protocol.QuickswapV3]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/quickswap.exchange.png',
  [Protocol.Renzo]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/www.renzoprotocol.com.png',
  [Protocol.RocketPool]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/rocketpool.net.png',
  [Protocol.SparkV1]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/www.spark.fi.png',
  [Protocol.StakeWise]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.stakepark.xyz.png',
  [Protocol.Stargate]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/stargate.finance.png',
  [Protocol.SushiswapV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.sushi.com.png',
  [Protocol.UniswapV2]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.uniswap.org.png',
  [Protocol.UniswapV3]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.uniswap.org.png',
  [Protocol.ZeroLend]:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/zerolend.xyz.png',
}
