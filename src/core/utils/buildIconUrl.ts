import { getAddress } from 'ethers'
import { Chain, ChainName } from '../constants/chains'
import { E_ADDRESS } from '../constants/E_ADDRESS'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { logger } from './logger'

export function buildTrustAssetIconUrl(
  chainId: Chain,
  smartContractAddress: string,
) {
  try {
    const checksumAddress = getAddress(smartContractAddress)

    let chainName = ChainName[chainId]

    if (chainName == ChainName[Chain.Avalanche]) {
      chainName = 'avalanchec'
    }

    if (checksumAddress === ZERO_ADDRESS || checksumAddress === E_ADDRESS) {
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/info/logo.png`
    }

    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${checksumAddress}/logo.png`
  } catch (error) {
    logger.error(`Error while building icon for ${smartContractAddress}`)
    return ''
  }
}
