import { getAddress } from 'ethers'
import { Chain, ChainName } from '../constants/chains'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'

export function buildTrustAssetIconUrl(
  chainId: Chain,
  smartContractAddress: string,
) {
  const checksumAddress = getAddress(smartContractAddress)

  let chainName = ChainName[chainId]

  if (chainName == ChainName[Chain.Avalanche]) {
    chainName = 'avalanchec'
  }

  if (checksumAddress === ZERO_ADDRESS) {
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/info/logo.png`
  }

  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${checksumAddress}/logo.png`
}
