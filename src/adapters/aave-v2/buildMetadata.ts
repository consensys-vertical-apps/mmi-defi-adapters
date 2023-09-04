import { ethers } from 'ethers'
import { Protocol } from '..'
import { Chain } from '../../core/constants/chains'
import { chainProviders } from '../../core/utils/chainProviders'
import { logger } from '../../core/utils/logger'
import { ProtocolDataProvider__factory } from './contracts'

type ChainDetails = {
  chainId: Chain
  provider: ethers.providers.StaticJsonRpcProvider
}

const CONTRACT_ADDRESSES: Partial<
  Record<
    Chain,
    {
      protocolDataProvider?: string
    }
  >
> = {
  [Chain.Ethereum]: {
    protocolDataProvider: '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
  },
}

export const buildMetadata = async (chainId: Chain) => {
  const contractAddresses = CONTRACT_ADDRESSES[chainId]
  const provider = chainProviders[chainId]

  if (!contractAddresses || !provider) {
    return
  }

  logger.info(
    {
      protocol: Protocol.AaveV2,
      chainId,
      chainDetails: contractAddresses,
    },
    'Metadata extraction script started',
  )

  await lpMetadata({
    chainId,
    provider,
    protocolDataProvider: contractAddresses.protocolDataProvider,
  })

  // await vestingMetadata({
  //   chainId,
  //   provider,
  //   vestingContractAddress: contractAddresses.vestingContractAddress,
  // })

  logger.info(
    {
      protocol: Protocol.AaveV2,
      chainId,
      chainDetails: contractAddresses,
    },
    'Metadata extraction script finished',
  )
}

async function lpMetadata({
  chainId,
  provider,
  protocolDataProvider,
}: ChainDetails & { protocolDataProvider: string | undefined }) {
  if (!protocolDataProvider) {
    return
  }

  const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
    protocolDataProvider,
    provider,
  )
}
