import { getAddress } from 'ethers'
import { E_ADDRESS } from '../constants/E_ADDRESS.js'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS.js'
import { Chain } from '../constants/chains.js'
import { logger } from './logger.js'
import { nativeToken } from './nativeTokens.js'

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
