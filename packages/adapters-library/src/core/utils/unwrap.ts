import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { TokenType, UnderlyingTokenTypeMap } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import {
  NotImplementedError,
  ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
} from '../errors/errors'
import type { IUnwrapCache } from '../unwrapCache'
import { extractErrorMessage } from './extractErrorMessage'
import { logger } from './logger'

type Token = Erc20Metadata & {
  tokens?: Token[]
  priceRaw?: bigint
  type: TokenType
}

export async function unwrap(
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
  tokens: Token[],
  fieldToUpdate: string,
  unwrapCache: IUnwrapCache,
  includePrices: boolean,
) {
  return await Promise.all(
    tokens.map(async (token) => {
      await unwrapToken(
        adapter,
        blockNumber,
        token,
        fieldToUpdate,
        unwrapCache,
        includePrices,
        [token.address],
      )
    }),
  )
}

async function unwrapToken(
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
  token: Token,
  fieldToUpdate: string,
  unwrapCache: IUnwrapCache,
  includePrices: boolean,
  tokensSeen: string[],
) {
  const underlyingProtocolTokenAdapter =
    await adapter.adaptersController.fetchTokenAdapter(
      adapter.chainId,
      token.address,
    )

  if (!token.tokens?.some((t) => t.type === TokenType.Underlying)) {
    // Only fetch prices or underlyings if the token is not already unwrapped

    if (!underlyingProtocolTokenAdapter) {
      // Try to fetch prices if there is no tokens and no adapter to resolve
      const tokenPriceRaw = await fetchPrice(
        adapter,
        token,
        blockNumber,
        unwrapCache,
        includePrices,
      )
      if (tokenPriceRaw) {
        token.priceRaw = tokenPriceRaw
      }
    } else {
      // Populate underlying tokens if there is an adapter for this token
      const unwrapExchangeRates = await fetchUnwrapExchangeRates(
        underlyingProtocolTokenAdapter,
        token,
        blockNumber,
        unwrapCache,
      )

      if (unwrapExchangeRates?.tokens) {
        if (!token.tokens) {
          // Initialize tokens array if it's undefined
          token.tokens = []
        }

        token.tokens.push(
          ...unwrapExchangeRates.tokens.map((unwrappedTokenExchangeRate) => ({
            address: unwrappedTokenExchangeRate.address,
            name: unwrappedTokenExchangeRate.name,
            symbol: unwrappedTokenExchangeRate.symbol,
            decimals: unwrappedTokenExchangeRate.decimals,
            type: UnderlyingTokenTypeMap[token.type],
            [fieldToUpdate]:
              (((token as Record<string, unknown>)[fieldToUpdate] as bigint) *
                unwrappedTokenExchangeRate.underlyingRateRaw) /
              10n ** BigInt(token.decimals),
          })),
        )
      }
    }
  }

  await Promise.all(
    token.tokens
      ?.filter(
        (underlyingToken) => !tokensSeen.includes(underlyingToken.address),
      )
      .map(async (underlyingToken) => {
        await unwrapToken(
          adapter,
          blockNumber,
          underlyingToken,
          fieldToUpdate,
          unwrapCache,
          includePrices,
          [...tokensSeen, underlyingToken.address],
        )
      }) ?? [],
  )
}

async function fetchUnwrapExchangeRates(
  underlyingProtocolTokenAdapter: IProtocolAdapter,
  underlyingProtocolTokenPosition: Token,
  blockNumber: number | undefined,
  unwrapCache: IUnwrapCache,
) {
  try {
    return await unwrapCache.fetchUnwrapWithCache(
      underlyingProtocolTokenAdapter,
      {
        protocolTokenAddress: underlyingProtocolTokenPosition.address,
        blockNumber,
      },
    )
  } catch (error) {
    if (
      !(
        error instanceof
        ProtocolSmartContractNotDeployedAtRequestedBlockNumberError
      ) &&
      !(error instanceof NotImplementedError)
    ) {
      throw error
    }
  }
}

async function fetchPrice(
  adapter: IProtocolAdapter,
  token: Erc20Metadata & { priceRaw?: bigint },
  blockNumber: number | undefined,
  unwrapCache: IUnwrapCache,
  includePrices: boolean,
) {
  if (!includePrices) {
    return undefined
  }

  const priceAdapter = adapter.adaptersController.priceAdapters.get(
    adapter.chainId,
  )

  if (!priceAdapter) {
    throw new Error(`Price adapter missing for chain ${adapter.chainId}`)
  }

  try {
    const price = await unwrapCache.fetchPriceWithCache(priceAdapter, {
      tokenMetadata: token,
      blockNumber,
    })

    return price.tokens![0]!.underlyingRateRaw
  } catch (error) {
    logger.debug(
      {
        error: extractErrorMessage(error),
        blockNumber,
        token,
        chainId: adapter.chainId,
        protocolId: adapter.protocolId,
        productId: adapter.productId,
      },
      'Error getting price for underlying token',
    )
  }
}
