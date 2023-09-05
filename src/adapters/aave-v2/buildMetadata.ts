import { ethers } from 'ethers'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Protocol } from '..'
import { Chain, ChainNames } from '../../core/constants/chains'
import { chainProviders } from '../../core/utils/chainProviders'
import { ERC20, getTokenMetadata } from '../../core/utils/getTokenMetadata'
import { logger } from '../../core/utils/logger'
import { Json } from '../../types/json'
import { ProtocolDataProvider__factory } from './contracts'

export type AaveV2PoolMetadata = Record<
  string,
  {
    protocolToken: ERC20
    underlyingToken: ERC20
  }
>

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

  const reserveTokens =
    await protocolDataProviderContract.getAllReservesTokens()

  const aTokenMetadataObject: AaveV2PoolMetadata = {}
  const stableDebtTokenMetadataObject: AaveV2PoolMetadata = {}
  const variableDebtTokenMetadataObject: AaveV2PoolMetadata = {}

  for (const { tokenAddress } of reserveTokens) {
    const reserveTokenAddresses =
      await protocolDataProviderContract.getReserveTokensAddresses(tokenAddress)

    const underlyingTokenMetadata = await getThinTokenMetadata(
      tokenAddress,
      chainId,
    )

    const setProtocolToken = async (
      tokenAddress: string,
      tokenMetadataObject: AaveV2PoolMetadata,
    ) => {
      const protocolTokenMetadata = await getThinTokenMetadata(
        tokenAddress,
        chainId,
      )
      tokenMetadataObject[protocolTokenMetadata.address] = {
        protocolToken: protocolTokenMetadata,
        underlyingToken: underlyingTokenMetadata,
      }
    }

    setProtocolToken(reserveTokenAddresses.aTokenAddress, aTokenMetadataObject)
    setProtocolToken(
      reserveTokenAddresses.stableDebtTokenAddress,
      stableDebtTokenMetadataObject,
    )
    setProtocolToken(
      reserveTokenAddresses.variableDebtTokenAddress,
      variableDebtTokenMetadataObject,
    )
  }

  await writeMetadataToFile(
    'pool',
    chainId,
    aTokenMetadataObject,
    'a-token-pool-metadata.json',
  )

  await writeMetadataToFile(
    'pool',
    chainId,
    stableDebtTokenMetadataObject,
    'stable-debt-token-pool-metadata.json',
  )

  await writeMetadataToFile(
    'pool',
    chainId,
    variableDebtTokenMetadataObject,
    'variable-debt-token-pool-metadata.json',
  )
}

async function getThinTokenMetadata(tokenAddress: string, chainId: Chain) {
  const { iconUrl: _, ...token } = await getTokenMetadata({
    tokenAddress,
    chainId,
  })

  return token
}

async function writeMetadataToFile<MetadataObject extends Json>(
  product: string,
  chainId: Chain,
  metadataObject: MetadataObject,
  fileName: string,
) {
  const filePath = path.resolve(
    __dirname,
    `./products/${product}/${ChainNames[chainId]}/${fileName}`,
  )

  await fs.mkdir(path.dirname(filePath), { recursive: true })

  return fs.writeFile(
    filePath,
    JSON.stringify(metadataObject, null, 2),
    'utf-8',
  )
}
