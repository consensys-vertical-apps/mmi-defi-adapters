import { getAddress } from 'ethers'
import { E_ADDRESS } from '../constants/E_ADDRESS'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { Chain } from '../constants/chains'
import { logger } from './logger'
import { nativeToken } from './nativeTokens'
import { Protocol } from '../../adapters/protocols'

// names are here https://github.com/trustwallet/assets/tree/master/blockchains
const chainNameMap: Record<Chain, string> = {
  [Chain.Avalanche]: 'avalanchec',
  [Chain.Polygon]: 'polygon',
  [Chain.Optimism]: 'optimism',
  [Chain.Arbitrum]: 'arbitrum',
  [Chain.Ethereum]: 'ethereum',
  [Chain.Bsc]: 'binance',
  [Chain.Fantom]: 'fantom',
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

export const TrustWalletProtocolIconMap = {
  'aave-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/aave.com.png',
  'aave-v3':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/aave.com.png',
  'angle-protocol':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/angle.money.png',
  'balancer-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/balancer.exchange.png',
  beefy:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.beefy.finance.png',

  'compound-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/compound.finance.png',
  'compound-v3':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/compound.finance.png',
  convex:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/www.convexfinance.com.png',
  curve:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/curve.fi.png',

  gmx: 'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/gmx.io.png',
  'gmx-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/gmx.io.png',

  jito: 'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/www.jito.network.png',
  lido: 'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/lido.fi.png',

  maker:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/makerdao.com.png',

  'morpho-aave-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.morpho.org.png',
  'morpho-aave-v3':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.morpho.org.png',
  'morpho-blue':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.morpho.org.png',
  'morpho-compound-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.morpho.org.png',

  'pancakeswap-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/pancakeswap.finance.png',
  pendle:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/pendle.finance.png',
  'quickswap-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/quickswap.exchange.png',
  'quickswap-v3':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/quickswap.exchange.png',
  renzo:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/www.renzoprotocol.com.png',
  'rocket-pool':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/rocketpool.net.png',

  'spark-v1':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/www.spark.fi.png',
  'stake-wise':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.stakepark.xyz.png',
  stargate:
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/stargate.finance.png',
  'sushiswap-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.sushi.com.png',

  'uniswap-v2':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.uniswap.org.png',
  'uniswap-v3':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/app.uniswap.org.png',

  'zero-lend':
    'https://raw.githubusercontent.com/trustwallet/assets/master/dapps/zerolend.xyz.png',
} as const
