import { ethers, isError } from 'ethers'
import { Erc20, Erc20__factory } from '../../contracts'
import { Chain } from '../constants/chains'
import TOKEN_METADATA_ARBITRUM from '../metadata/token-metadata-arbitrum.json'
import TOKEN_METADATA_ETHEREUM from '../metadata/token-metadata-ethereum.json'
import { chainProviders } from './chainProviders'
import { extractErrorMessage } from './error'
import { logger } from './logger'

export type Erc20Metadata = {
  address: string
  name: string
  symbol: string
  decimals: number
  iconUrl?: string
}

const CHAIN_METADATA: Partial<
  Record<Chain, Record<string, Erc20Metadata | undefined>>
> = {
  [Chain.Ethereum]: TOKEN_METADATA_ETHEREUM,
  [Chain.Arbitrum]: TOKEN_METADATA_ARBITRUM,
}

export async function getThinTokenMetadata(
  tokenAddress: string,
  chainId: Chain,
) {
  const { iconUrl: _, ...token } = await getTokenMetadata({
    tokenAddress,
    chainId,
  })

  return token
}

export async function getTokenMetadata({
  tokenAddress,
  chainId,
}: {
  tokenAddress: string
  chainId: Chain
}): Promise<Erc20Metadata> {
  const fileMetadata = CHAIN_METADATA[chainId]
  if (fileMetadata) {
    const fileTokenMetadata = fileMetadata[tokenAddress]
    if (fileTokenMetadata) {
      logger.debug(
        { tokenAddress, chainId },
        'Token metadata found on cached file',
      )
      return fileTokenMetadata
    }
  }

  const onChainTokenMetadata = await getOnChainTokenMetadata(
    tokenAddress,
    chainId,
  )
  if (onChainTokenMetadata) {
    logger.debug({ tokenAddress, chainId }, 'Token metadata found on chain')
    return onChainTokenMetadata
  }

  const errorMessage = 'Cannot find token metadata for token'
  logger.error({ tokenAddress, chainId }, errorMessage)
  throw new Error(errorMessage)
}

async function getOnChainTokenMetadata(
  tokenAddress: string,
  chainId: Chain,
): Promise<Erc20Metadata | undefined> {
  const provider = chainProviders[chainId]
  if (!provider) {
    return undefined
  }

  const tokenContract = Erc20__factory.connect(tokenAddress, provider)

  try {
    const name = await fetchStringTokenData(tokenContract, provider, 'name')
    const symbol = await fetchStringTokenData(tokenContract, provider, 'symbol')
    const decimals = Number(await tokenContract.decimals())
    return {
      address: (await tokenContract.getAddress()).toLowerCase(),
      name,
      symbol,
      decimals,
    }
  } catch (error) {
    const errorMessage = extractErrorMessage(error)
    logger.warn(
      { tokenAddress, chainId, errorMessage },
      'Failed to fetch token metadata on-chain',
    )
    return undefined
  }
}

async function fetchStringTokenData(
  tokenContract: Erc20,
  provider: ethers.JsonRpcProvider,
  functionName: 'name' | 'symbol',
): Promise<string> {
  try {
    return await tokenContract[functionName]()
  } catch (error) {
    if (!isError(error, 'BAD_DATA')) {
      throw error
    }

    const contractAddress = await tokenContract.getAddress()

    logger.debug(
      { contractAddress, ...error },
      `Failed to fetch token ${functionName} as a string. Using bytes32 fallback`,
    )

    // Fallback for contracts that return bytes32 instead of string
    const result = await provider.call({
      to: contractAddress,
      data: tokenContract[functionName].fragment.selector,
    })
    return ethers.decodeBytes32String(result)
  }
}
