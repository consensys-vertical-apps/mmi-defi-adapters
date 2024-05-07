import { ethers, getAddress, isError } from 'ethers'
import { Erc20, Erc20__factory } from '../../contracts'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { Chain } from '../constants/chains'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { extractErrorMessage } from './extractErrorMessage'
import { logger } from './logger'
import { nativeToken, nativeTokenAddresses } from './nativeTokens'

/**
 * This token does not implement decimals, name or symbol
 * It causes problems when fetching metadata on-chain
 * Since it appears to be a one off we will hardcode data to prevent failures
 */
export const REAL_ESTATE_TOKEN_METADATA = {
  address: getAddress('0x6b8734ad31D42F5c05A86594314837C416ADA984'),
  name: 'Real Estate USD (REUSD)',
  symbol: 'Real Estate USD (REUSD)',
  decimals: 18,
}

export async function getTokenMetadata(
  tokenAddress: string,
  chainId: Chain,
  provider: CustomJsonRpcProvider,
): Promise<Erc20Metadata> {
  /**
   * Manage troublesome token
   */
  if (
    getAddress(tokenAddress) === REAL_ESTATE_TOKEN_METADATA.address &&
    chainId === Chain.Ethereum
  ) {
    return REAL_ESTATE_TOKEN_METADATA
  }
  if (nativeTokenAddresses.includes(tokenAddress)) {
    return {
      address: getAddress(tokenAddress),
      ...nativeToken[chainId],
    }
  }

  /**
   * Manage native tokens which dont have smart contract and therefore no methods for name, decimal, symbol
   */
  const onChainTokenMetadata = await getOnChainTokenMetadata(
    tokenAddress,
    chainId,
    provider,
  )
  if (onChainTokenMetadata) {
    return onChainTokenMetadata
  }

  const errorMessage = 'Cannot find token metadata for token'
  logger.error({ tokenAddress, chainId }, errorMessage)
  throw new Error(errorMessage)
}

export async function getOnChainTokenMetadata(
  tokenAddress: string,
  chainId: Chain,
  provider: CustomJsonRpcProvider,
): Promise<Erc20Metadata | undefined> {
  const tokenContract = Erc20__factory.connect(tokenAddress, provider)

  try {
    const [name, symbol, decimal] = await Promise.all([
      fetchStringTokenData(tokenContract, provider, 'name'),
      fetchStringTokenData(tokenContract, provider, 'symbol'),
      tokenContract.decimals(),
    ])

    return {
      address: getAddress(await tokenContract.getAddress()),
      name,
      symbol,
      decimals: Number(decimal),
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
