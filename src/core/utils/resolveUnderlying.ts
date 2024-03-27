import { Protocol } from '../../adapters/protocols'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import {
  AdapterMissingError,
  ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
} from '../errors/errors'
import { logger } from './logger'

type Token = Erc20Metadata & {
  tokens?: Token[]
  priceRaw?: bigint
}

export async function resolveUnderlyings(
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
  tokens: Token[],
  updateUnderlyingToken: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    underlyingToken: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protocolToken: any,
    underlyingRateRaw: bigint,
  ) => void,
) {
  const promises = tokens.map(async (token) => {
    if (token.tokens) {
      // Resolve underlying tokens if they exist
      await resolveUnderlyings(
        adapter,
        blockNumber,
        token.tokens,
        updateUnderlyingToken,
      )
      return
    }

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
    const underlyingRates = await fetchUnderlyingRates(
      underlyingProtocolTokenAdapter,
      token,
      blockNumber,
    )

    token.tokens = underlyingRates?.tokens?.map((underlyingTokenRate) => {
      const underlyingToken = {
        address: underlyingTokenRate.address,
        name: underlyingTokenRate.name,
        symbol: underlyingTokenRate.symbol,
        decimals: underlyingTokenRate.decimals,
        type: underlyingTokenRate.type,
      }

      updateUnderlyingToken(
        underlyingToken,
        token,
        underlyingTokenRate.underlyingRateRaw,
      )

      return underlyingToken
    })

    await resolveUnderlyings(
      adapter,
      blockNumber,
      token.tokens!,
      updateUnderlyingToken,
    )
  })

  await Promise.all(promises)
}

async function fetchUnderlyingRates(
  underlyingProtocolTokenAdapter: IProtocolAdapter,
  underlyingProtocolTokenPosition: Token,
  blockNumber: number | undefined,
) {
  try {
    return await underlyingProtocolTokenAdapter.getProtocolTokenToUnderlyingTokenRate(
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
  let priceAdapter
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
    const price = await priceAdapter.getProtocolTokenToUnderlyingTokenRate({
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
