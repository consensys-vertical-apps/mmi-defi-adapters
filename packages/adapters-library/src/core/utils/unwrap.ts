import { Protocol } from '../../adapters/protocols.js'
import type { IProtocolAdapter } from '../../types/IProtocolAdapter.js'
import { TokenType, UnderlyingTokenTypeMap } from '../../types/adapter.js'
import type { Erc20Metadata } from '../../types/erc20Metadata.js'
import type { IUnwrapCache } from '../../unwrapCache.js'
import {
  AdapterMissingError,
  NotImplementedError,
  ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
} from '../errors/errors.js'
import { logger } from './logger.js'

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
) {
  return await Promise.all(
    tokens.map(async (token) => {
      await unwrapToken(adapter, blockNumber, token, fieldToUpdate, unwrapCache)
    }),
  )
}

async function unwrapToken(
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
  token: Token,
  fieldToUpdate: string,
  unwrapCache: IUnwrapCache,
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
    token.tokens?.map(async (underlyingToken) => {
      await unwrapToken(
        adapter,
        blockNumber,
        underlyingToken,
        fieldToUpdate,
        unwrapCache,
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
    return await unwrapCache.fetchWithCache(underlyingProtocolTokenAdapter, {
      protocolTokenAddress: underlyingProtocolTokenPosition.address,
      blockNumber,
    })
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
) {
  let priceAdapter: IProtocolAdapter
  try {
    priceAdapter = adapter.adaptersController.fetchAdapter(
      adapter.chainId,
      Protocol.PricesV2,
      'usd',
    )
  } catch (error) {
    // price adapter not enabled or no price adapter for this chain
    if (!(error instanceof AdapterMissingError)) {
      throw error
    }
    return
  }

  try {
    const price = await unwrapCache.fetchWithCache(priceAdapter, {
      protocolTokenAddress: token.address,
      blockNumber,
    })

    return price.tokens![0]!.underlyingRateRaw
  } catch (error) {
    logger.debug(
      {
        error,
        blockNumber,
        token,
      },
      'Error getting price for underlying token',
    )
  }
}
