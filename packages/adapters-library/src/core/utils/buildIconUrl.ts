import { getAddress } from 'ethers'
import { E_ADDRESS } from '../constants/E_ADDRESS'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { Chain, ChainName } from '../constants/chains'
import { logger } from './logger'

// names are here https://github.com/trustwallet/assets/tree/master/blockchains
const chainNameMap: Record<string, string> = {
  [Chain.Avalanche]: 'avalanchec',
  [Chain.Polygon]: 'polygon',
  [Chain.Optimism]: 'optimism',
  [Chain.Arbitrum]: 'arbitrum',
  [Chain.Ethereum]: 'ethereum',
  [Chain.Bsc]: 'binance',
  [Chain.Fantom]: 'fantom',
  [Chain.Base]: 'base',
  [Chain.Linea]: 'linea',
}

export function buildTrustAssetIconUrl(
  chainId: Chain,
  smartContractAddress: string,
) {
  try {
    const checksumAddress = getAddress(smartContractAddress)

    const chainName = chainNameMap[chainId]

    if (checksumAddress === ZERO_ADDRESS || checksumAddress === E_ADDRESS) {
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/info/logo.png`
    }

    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${checksumAddress}/logo.png`
  } catch (error) {
    logger.error(`Error while building icon for ${smartContractAddress}`)
    return ''
  }
}
