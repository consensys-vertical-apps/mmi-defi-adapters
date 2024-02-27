import { ethers, getAddress, isError } from 'ethers'
import { Erc20, Erc20__factory } from '../../contracts'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { Chain } from '../constants/chains'
import TOKEN_METADATA_ARBITRUM from '../metadata/token-metadata-arbitrum.json'
import TOKEN_METADATA_ETHEREUM from '../metadata/token-metadata-ethereum.json'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { extractErrorMessage } from './extractErrorMessage'
import { logger } from './logger'
import { priceAdapterConfig } from '../../adapters/prices-v2/products/usd/priceV2Config'

const CHAIN_METADATA: Partial<
  Record<Chain, Record<string, Erc20Metadata | undefined>>
> = {
  [Chain.Ethereum]: TOKEN_METADATA_ETHEREUM,
  [Chain.Arbitrum]: TOKEN_METADATA_ARBITRUM,
}

export async function getTokenMetadata(
  tokenAddress: string,
  chainId: Chain,
  provider: CustomJsonRpcProvider,
): Promise<Erc20Metadata> {
  if (tokenAddress === '0x6b8734ad31D42F5c05A86594314837C416ADA984') {
    return {
      address: getAddress(tokenAddress),
      name: 'Real Estate USD (REUSD)',
      symbol: 'Real Estate USD (REUSD)',
      decimals: 0,
    }
  }
  if (tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
    const nativeToken =
      priceAdapterConfig[chainId as keyof typeof priceAdapterConfig].nativeToken
    return {
      address: getAddress(tokenAddress),
      ...nativeToken,
    }
  }

  const fileMetadata = CHAIN_METADATA[chainId]
  if (fileMetadata) {
    const fileTokenMetadata = fileMetadata[tokenAddress.toLowerCase()]
    if (fileTokenMetadata) {
      logger.debug(
        { tokenAddress, chainId },
        'Token metadata found on cached file',
      )
      return {
        address: getAddress(fileTokenMetadata.address),
        name: fileTokenMetadata.name,
        symbol: fileTokenMetadata.symbol,
        decimals: fileTokenMetadata.decimals,
      }
    }
  }

  const onChainTokenMetadata = await getOnChainTokenMetadata(
    tokenAddress,
    chainId,
    provider,
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
  provider: CustomJsonRpcProvider,
): Promise<Erc20Metadata | undefined> {
  const tokenContract = Erc20__factory.connect(tokenAddress, provider)

  try {
    const name = await fetchStringTokenData(tokenContract, provider, 'name')
    const symbol = await fetchStringTokenData(tokenContract, provider, 'symbol')
    const decimals = Number(await tokenContract.decimals())
    return {
      address: getAddress(await tokenContract.getAddress()),
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
  provider: CustomJsonRpcProvider,
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
