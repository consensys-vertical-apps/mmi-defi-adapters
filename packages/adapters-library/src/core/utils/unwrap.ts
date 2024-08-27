import { Protocol } from '../../adapters/protocols'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { TokenType, UnderlyingTokenTypeMap } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import {
  AdapterMissingError,
  NotImplementedError,
  ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
} from '../errors/errors'
import { logger } from './logger'

type Token = Erc20Metadata & {
  tokens?: Token[]
  priceRaw?: bigint
  type: TokenType
}

export async function unwrapAll(
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
  tokens: Token[],
  fieldToUpdate: string,
) {
  const promises = tokens.map(async (token) => {
    await unwrap(adapter, blockNumber, token, fieldToUpdate)
  })

  await Promise.all(promises)
}

export async function unwrap(
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
  token: Token,
  fieldToUpdate: string,
) {
  if (
    !token.tokens ||
    token.tokens.every(
      (token) =>
        token.type === TokenType.UnderlyingClaimable ||
        token.type === TokenType.Reward,
    )
  ) {
    const underlyingProtocolTokenAdapter =
      await adapter.adaptersController.fetchTokenAdapter(
        adapter.chainId,
        token.address,
      )

    // Try to fetch prices if there is no tokens and no adapter to resolve
    // Return either way as this is a leaf
    if (!underlyingProtocolTokenAdapter) {
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

    if (!unwrapExchangeRates?.tokens) {
      return
    }

    if (!token.tokens) {
      token.tokens = []
    }

    token.tokens.push(
      ...unwrapExchangeRates.tokens.map((unwrappedTokenExchangeRate) => {
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
      }),
    )
  }

  const promises = token.tokens!.map(async (underlyingToken) => {
    await unwrap(adapter, blockNumber, underlyingToken, fieldToUpdate)
  })

  await Promise.all(promises)
}

// export async function unwrap(
//   adapter: IProtocolAdapter,
//   blockNumber: number | undefined,
//   tokens: Token[],
//   fieldToUpdate: string,
// ) {
//   const promises = tokens.map(async (token) => {
//     if (token.tokens) {
//       const hasNonRewardUnderlyings = !token.tokens.every(
//         (token) =>
//           token.type === TokenType.UnderlyingClaimable ||
//           token.type === TokenType.Reward,
//       )

//       if (!hasNonRewardUnderlyings) {
//         // Resolve underlying tokens if they exist
//         await unwrap(adapter, blockNumber, token.tokens, fieldToUpdate)
//       }
//     }

//     const underlyingProtocolTokenAdapter =
//       await adapter.adaptersController.fetchTokenAdapter(
//         adapter.chainId,
//         token.address,
//       )

//     if (!underlyingProtocolTokenAdapter) {
//       // Fetch prices if there is no tokens and no adapter to resolve
//       const tokenPriceRaw = await fetchPrice(adapter, token, blockNumber)
//       if (tokenPriceRaw) {
//         token.priceRaw = tokenPriceRaw
//       }
//       return
//     }

//     if (
//       token.address === '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490' ||
//       token.address === '0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434'
//     ) {
//       console.log('AAAAAA', token)
//     }

//     // Populate underlying tokens if there is an adapter for this token
//     const unwrapExchangeRates = await fetchUnwrapExchangeRates(
//       underlyingProtocolTokenAdapter,
//       token,
//       blockNumber,
//     )

//     if (
//       token.address === '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490' ||
//       token.address === '0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434'
//     ) {
//       console.log('BBBBBBBBBBBB', unwrapExchangeRates)
//     }

//     if (!unwrapExchangeRates?.tokens) {
//       return
//     }

//     if (!token.tokens) {
//       token.tokens = []
//     }

//     token.tokens.push(
//       ...unwrapExchangeRates.tokens.map((unwrappedTokenExchangeRate) => {
//         const underlyingToken = {
//           address: unwrappedTokenExchangeRate.address,
//           name: unwrappedTokenExchangeRate.name,
//           symbol: unwrappedTokenExchangeRate.symbol,
//           decimals: unwrappedTokenExchangeRate.decimals,
//           type: UnderlyingTokenTypeMap[token.type],
//           [fieldToUpdate]:
//           // biome-ignore lint/suspicious/noExplicitAny: Too many possible options
//             (((token as any)[fieldToUpdate] as bigint) *
//               unwrappedTokenExchangeRate.underlyingRateRaw) /
//             10n ** BigInt(token.decimals),
//         }

//         return underlyingToken
//       }),
//     )

//     await unwrap(adapter, blockNumber, token.tokens!, fieldToUpdate)
//   })

//   await Promise.all(promises)
// }

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
