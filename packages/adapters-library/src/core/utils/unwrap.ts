import { Protocol } from '../../adapters/protocols'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { TokenType, UnderlyingTokenTypeMap } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import {
  AdapterMissingError,
  NotImplementedError,
  ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
} from '../errors/errors'
import { filterMapSync } from './filters'
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
) {
  return await Promise.all(
    tokens.map(async (token) => {
      await unwrapToken(adapter, blockNumber, token, fieldToUpdate)
    }),
  )
}

async function unwrapToken(
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
  token: Token,
  fieldToUpdate: string,
) {
  const underlyingProtocolTokenAdapter =
    await adapter.adaptersController.fetchTokenAdapter(
      adapter.chainId,
      token.address,
    )

  // Try to fetch prices if there is no tokens and no adapter to resolve
  if (!underlyingProtocolTokenAdapter) {
    const tokenPriceRaw = await fetchPrice(adapter, token, blockNumber)
    if (tokenPriceRaw) {
      token.priceRaw = tokenPriceRaw
    }
  } else {
    // Populate underlying tokens if there is an adapter for this token
    const unwrapExchangeRates = await fetchUnwrapExchangeRates(
      underlyingProtocolTokenAdapter,
      token,
      blockNumber,
    )

    if (unwrapExchangeRates?.tokens) {
      if (!token.tokens) {
        token.tokens = []
      }

      token.tokens.push(
        ...filterMapSync(
          unwrapExchangeRates.tokens,
          (unwrappedTokenExchangeRate) => {
            if (
              token.tokens?.find(
                (t) =>
                  t.type !== TokenType.UnderlyingClaimable &&
                  t.type !== TokenType.Reward &&
                  t.address === unwrappedTokenExchangeRate.address,
              )
            ) {
              return
            }

            const underlyingToken = {
              address: unwrappedTokenExchangeRate.address,
              name: unwrappedTokenExchangeRate.name,
              symbol: unwrappedTokenExchangeRate.symbol,
              decimals: unwrappedTokenExchangeRate.decimals,
              type: UnderlyingTokenTypeMap[token.type],
              [fieldToUpdate]:
              // biome-ignore lint/suspicious/noExplicitAny: Too many possible options
                (((token as any)[fieldToUpdate] as bigint) *
                  unwrappedTokenExchangeRate.underlyingRateRaw) /
                10n ** BigInt(token.decimals),
            }

            return underlyingToken
          },
        ),
      )
    }
  }

  await Promise.all(
    token.tokens?.map(async (underlyingToken) => {
      await unwrapToken(adapter, blockNumber, underlyingToken, fieldToUpdate)
    }) ?? [],
  )
}

async function fetchUnwrapExchangeRates(
  underlyingProtocolTokenAdapter: IProtocolAdapter,
  underlyingProtocolTokenPosition: Token,
  blockNumber: number | undefined,
) {
  try {
    return await underlyingProtocolTokenAdapter.unwrap({
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
    const price = await priceAdapter.unwrap({
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
