import { getAddress } from 'ethers'
import { Chain, ChainName } from '../constants/chains'

export function buildTrustAssetIconUrl(
  chainId: Chain,
  smartContractAddress: string,
) {
  const checksumAddress = getAddress(smartContractAddress)

  let chainName = ChainName[chainId]

  if (chainName == ChainName[Chain.Avalanche]) {
    chainName = 'avalanchec'
  }

  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${checksumAddress}/logo.png`
}
