import { Protocol } from '../../adapters/protocols'
import {
  GetEventsInput,
  GetPositionsInput,
  MovementsByBlock,
  TokenBalance,
  Underlying,
} from '../../types/adapter'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { SimplePoolAdapter } from '../adapters/SimplePoolAdapter'
import {
  AdapterMissingError,
  ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
} from '../errors/errors'
import { logger } from '../utils/logger'

export function ResolveUnderlyingPositions(
  originalMethod: SimplePoolAdapter['getPositions'],
  _context: ClassMethodDecoratorContext,
) {
  async function replacementMethod(
    this: IProtocolAdapter,
    input: GetPositionsInput,
  ) {
    const protocolTokens = await originalMethod.call(this, input)

    await recursivePositionSolver({
      adapter: this,
      tokenPositions: protocolTokens,
      blockNumber: input.blockNumber,
    })

    return protocolTokens
  }

  return replacementMethod
}

export function ResolveUnderlyingMovements(
  originalMethod:
    | SimplePoolAdapter['getWithdrawals']
    | SimplePoolAdapter['getDeposits'],
  _context: ClassMethodDecoratorContext,
) {
  async function replacementMethod(
    this: IProtocolAdapter,
    input: GetEventsInput,
  ) {
    const protocolTokens = await originalMethod.call(this, input)

    const promises = []
    for (const protocolToken of protocolTokens) {
      const blockNumber = protocolToken?.blockNumber

      promises.push(getUnderlyingAndRecurse(protocolToken, this, blockNumber))
    }

    await Promise.all(promises)

    return protocolTokens
  }

  return replacementMethod
}

/**
 * Iterates though a list of token positions, identifies if any of them are a protocol token
 * and resolves them using the correct adapter. Does so recursively until no protocol tokens need resolving.
 */
async function recursivePositionSolver({
  adapter,
  tokenPositions,
  blockNumber,
}: {
  adapter: IProtocolAdapter
  tokenPositions: (TokenBalance & { tokens?: Underlying[] })[]
  blockNumber?: number
}) {
  const promises = []
  for (const tokenPosition of tokenPositions) {
    promises.push(getUnderlyingAndRecurse(tokenPosition, adapter, blockNumber))
  }

  await Promise.all(promises)
}

async function getUnderlyingAndRecurse(
  tokenPosition: (TokenBalance & { tokens?: Underlying[] }) | MovementsByBlock,
  adapter: IProtocolAdapter,
  blockNumber: number | undefined,
) {
  if (!tokenPosition.tokens) {
    return
  }

  await resolveUnderlying({
    underlying: tokenPosition.tokens,
    adapter,
    blockNumber,
  })

  await recursivePositionSolver({
    adapter,
    tokenPositions: tokenPosition.tokens,
    blockNumber,
  })
}

async function resolveUnderlying({
  underlying,
  adapter,
  blockNumber,
}: {
  underlying: Underlying[]
  adapter: IProtocolAdapter
  blockNumber: number | undefined
}) {
  if (!underlying) {
    return
  }

  const promises = []

  for (const underlyingProtocolTokenPosition of underlying) {
    promises.push(
      computeUnderlyingTokenBalancesOrFetchPrice(
        adapter,
        underlyingProtocolTokenPosition,
        blockNumber,
      ),
    )
  }

  await Promise.all(promises)
}

async function computeUnderlyingTokenBalancesOrFetchPrice(
  adapter: IProtocolAdapter,
  underlyingProtocolTokenPosition: Underlying,
  blockNumber: number | undefined,
) {
  if (underlyingProtocolTokenPosition.tokens) {
    return
  }

  const underlyingProtocolTokenAdapter =
    await adapter.adaptersController.fetchTokenAdapter(
      adapter.chainId,
      underlyingProtocolTokenPosition.address,
    )

  if (!underlyingProtocolTokenAdapter) {
    return fetchPrice(adapter, underlyingProtocolTokenPosition, blockNumber)
  } else {
    return fetchUnderlyingBalances(
      underlyingProtocolTokenAdapter,
      underlyingProtocolTokenPosition,
      blockNumber,
    )
  }
}

async function fetchUnderlyingBalances(
  underlyingProtocolTokenAdapter: IProtocolAdapter,
  underlyingProtocolTokenPosition: Underlying,
  blockNumber: number | undefined,
) {
  try {
    const protocolTokenUnderlyingRate =
      await underlyingProtocolTokenAdapter.getProtocolTokenToUnderlyingTokenRate(
        {
          protocolTokenAddress: underlyingProtocolTokenPosition.address,
          blockNumber: blockNumber,
        },
      )
    const computedUnderlyingPositions: Underlying[] =
      protocolTokenUnderlyingRate.tokens?.map((underlyingTokenRate) => {
        return {
          address: underlyingTokenRate.address,
          name: underlyingTokenRate.name,
          symbol: underlyingTokenRate.symbol,
          decimals: underlyingTokenRate.decimals,
          type: underlyingTokenRate.type,
          balanceRaw:
            (underlyingProtocolTokenPosition.balanceRaw *
              underlyingTokenRate.underlyingRateRaw) /
            10n ** BigInt(underlyingProtocolTokenPosition.decimals),
        }
      }) || []

    underlyingProtocolTokenPosition.tokens = [
      ...(underlyingProtocolTokenPosition.tokens || []),
      ...computedUnderlyingPositions,
    ]
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
  underlyingProtocolTokenPosition: Underlying,
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
      protocolTokenAddress: underlyingProtocolTokenPosition.address,
      blockNumber,
    })

    underlyingProtocolTokenPosition.priceRaw =
      price.tokens![0]!.underlyingRateRaw
    underlyingProtocolTokenPosition.tokens = undefined
    return
  } catch (error) {
    logger.debug(
      error,
      'Error getting price for underlying token: ' +
        underlyingProtocolTokenPosition.address +
        ' blockNumber:' +
        blockNumber?.toString(),
    )
    return
  }
}
