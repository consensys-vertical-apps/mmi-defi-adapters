import { ethers, logger } from 'ethers'
import { promises as fs } from 'fs'
import path from 'path'
import {
  StargateFactory__factory,
  StargateToken__factory,
  StargateVotingEscrow__factory,
} from '../../contracts'
import { Chain, ChainNames } from '../../core/constants/chains'
import { Protocol } from '../../core/constants/protocols'
import { chainProviders } from '../../core/utils/chainProviders'
import { ERC20, getTokenMetadata } from '../../core/utils/getTokenMetadata'
import { Json } from '../../types/json'

export type StargatePoolMetadata = Record<
  string,
  {
    poolId: number
    protocolToken: ERC20
    underlying: ERC20
  }
>

export type StargateVestingMetadata = {
  contractToken: ERC20
  underlyingToken: ERC20
}

type ChainDetails = {
  chainId: Chain
  provider: ethers.providers.StaticJsonRpcProvider
}

const CONTRACT_ADDRESSES: Partial<
  Record<
    Chain,
    {
      lpFactoryAddress?: string
      vestingContractAddress?: string
    }
  >
> = {
  [Chain.Ethereum]: {
    lpFactoryAddress: '0x06D538690AF257Da524f25D0CD52fD85b1c2173E',
    vestingContractAddress: '0x0e42acBD23FAee03249DAFF896b78d7e79fBD58E',
  },
  [Chain.Arbitrum]: {
    lpFactoryAddress: '0x55bDb4164D28FBaF0898e0eF14a589ac09Ac9970',
    vestingContractAddress: '0xfBd849E6007f9BC3CC2D6Eb159c045B8dc660268',
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
      protocol: Protocol.Stargate,
      chainId,
      chainDetails: contractAddresses,
    },
    'Metadata extraction script started',
  )

  await lpMetadata({
    chainId,
    provider,
    lpFactoryAddress: contractAddresses.lpFactoryAddress,
  })

  await vestingMetadata({
    chainId,
    provider,
    vestingContractAddress: contractAddresses.vestingContractAddress,
  })

  logger.info(
    {
      protocol: Protocol.Stargate,
      chainId,
      chainDetails: contractAddresses,
    },
    'Metadata extraction script finished',
  )
}

async function lpMetadata({
  chainId,
  provider,
  lpFactoryAddress,
}: ChainDetails & { lpFactoryAddress: string | undefined }) {
  if (!lpFactoryAddress) {
    return
  }

  const lpFactoryContract = StargateFactory__factory.connect(
    lpFactoryAddress,
    provider,
  )

  const poolsLength = (await lpFactoryContract.allPoolsLength()).toNumber()

  const metadataObject: StargatePoolMetadata = {}

  for (let i = 0; i < poolsLength; i++) {
    const poolAddress = (await lpFactoryContract.allPools(i)).toLowerCase()

    logger.info(
      {
        protocol: Protocol.Stargate,
        chainId,
        poolAddress,
        index: i + 1,
        total: poolsLength,
      },
      'Extracting pool metadata',
    )

    const poolContract = StargateToken__factory.connect(poolAddress, provider)

    const poolId = (await poolContract.poolId()).toNumber()
    const underlyingTokenAddress = (await poolContract.token()).toLowerCase()

    const protocolToken = await getThinTokenMetadata(poolAddress, chainId)
    const underlying = await getThinTokenMetadata(
      underlyingTokenAddress,
      chainId,
    )

    metadataObject[poolAddress] = {
      poolId,
      protocolToken,
      underlying,
    }
  }

  await writeMetadataToFile('pool', chainId, metadataObject)
}

async function vestingMetadata({
  chainId,
  provider,
  vestingContractAddress,
}: ChainDetails & { vestingContractAddress: string | undefined }) {
  if (!vestingContractAddress) {
    return
  }

  const votingEscrowContract = StargateVotingEscrow__factory.connect(
    vestingContractAddress,
    provider,
  )

  const underlyingTokenAddress = (
    await votingEscrowContract.token()
  ).toLowerCase()

  const contractToken = await getThinTokenMetadata(
    vestingContractAddress,
    chainId,
  )
  const underlyingToken = await getThinTokenMetadata(
    underlyingTokenAddress,
    chainId,
  )

  const metadataObject: StargateVestingMetadata = {
    contractToken,
    underlyingToken,
  }

  await writeMetadataToFile('vesting', chainId, metadataObject)
}

async function getThinTokenMetadata(tokenAddress: string, chainId: Chain) {
  const { iconUrl: _, ...token } = await getTokenMetadata({
    tokenAddress,
    chainId,
    throwOnFailure: true,
  })

  return token
}

async function writeMetadataToFile<MetadataObject extends Json>(
  product: string,
  chainId: Chain,
  metadataObject: MetadataObject,
) {
  const filePath = path.resolve(
    __dirname,
    `./products/${product}/${ChainNames[chainId]}/metadata.json`,
  )

  await fs.mkdir(path.dirname(filePath), { recursive: true })

  return fs.writeFile(
    filePath,
    JSON.stringify(metadataObject, null, 2),
    'utf-8',
  )
}
