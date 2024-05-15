import { Protocol } from '../../adapters/protocols'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import {
  AdapterMissingError,
  ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
} from '../errors/errors'
import { logger } from './logger'

type Token = Erc20Metadata & {
  tokens?: Token[]
  priceRaw?: bigint
}

export async function unwrap(
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
  tokens: Token[],
  fieldToUpdate: string,
) {
  const promises = tokens.map(async (token) => {
    if (token.tokens) {
      // Resolve underlying tokens if they exist
      await unwrap(adapter, blockNumber, token.tokens, fieldToUpdate)
      return
    }

    console.log(adapter.chainId, token.address)

    const underlyingProtocolTokenAdapter =
      await adapter.adaptersController.fetchTokenAdapter(
        adapter.chainId,
        token.address,
      )

    if (!underlyingProtocolTokenAdapter) {
      // Fetch prices if there is no tokens and no adapter to resolve
      const tokenPriceRaw = await fetchPrice(adapter, token, blockNumber)
      if (tokenPriceRaw) {
        token.priceRaw = tokenPriceRaw
      }
      return
    }

    // Populate underlying tokens if there is an adapter for this token
    const unwrapExchangeRates = await fetchUnwrapExchangeRates(
      underlyingProtocolTokenAdapter,
      token,
      blockNumber,
    )

    token.tokens = unwrapExchangeRates?.tokens?.map(
      (unwrappedTokenExchangeRate) => {
        const underlyingToken = {
          address: unwrappedTokenExchangeRate.address,
          name: unwrappedTokenExchangeRate.name,
          symbol: unwrappedTokenExchangeRate.symbol,
          decimals: unwrappedTokenExchangeRate.decimals,
          type: unwrappedTokenExchangeRate.type,
          [fieldToUpdate]:
            // biome-ignore lint/suspicious/noExplicitAny: Too many possible options
            (((token as any)[fieldToUpdate] as bigint) *
              unwrappedTokenExchangeRate.underlyingRateRaw) /
            10n ** BigInt(token.decimals),
        }

        return underlyingToken
      },
    )

    await unwrap(adapter, blockNumber, token.tokens!, fieldToUpdate)
  })

  await Promise.all(promises)
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
      )
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
