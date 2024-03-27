import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
} from '../../types/adapter'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { SimplePoolAdapter } from '../adapters/SimplePoolAdapter'
import { resolveTokenArray } from './resolveUnderlying'

export function ResolveUnderlyingPositions(
  originalMethod: SimplePoolAdapter['getPositions'],
  _context: ClassMethodDecoratorContext,
) {
  async function replacementMethod(
    this: IProtocolAdapter,
    input: GetPositionsInput,
  ) {
    const protocolTokens = await originalMethod.call(this, input)

    await resolveTokenArray(
      this,
      input.blockNumber,
      protocolTokens,
      (underlyingToken, protocolToken, underlyingRateRaw) => {
        underlyingToken.balanceRaw =
          (protocolToken.balanceRaw * underlyingRateRaw) /
          10n ** BigInt(protocolToken.decimals)
      },
    )

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

    const promises = protocolTokens.map(async (protocolToken) => {
      return await resolveTokenArray(
        this,
        protocolToken.blockNumber,
        protocolToken.tokens,
        (underlyingToken, protocolToken, underlyingRateRaw) => {
          underlyingToken.balanceRaw =
            (protocolToken.balanceRaw * underlyingRateRaw) /
            10n ** BigInt(protocolToken.decimals)
        },
      )
    })

    await Promise.all(promises)

    return protocolTokens
  }

  return replacementMethod
}

export function ResolveUnderlyingTvl(
  originalMethod: SimplePoolAdapter['getTotalValueLocked'],
  _context: ClassMethodDecoratorContext,
) {
  async function replacementMethod(
    this: IProtocolAdapter,
    input: GetTotalValueLockedInput,
  ) {
    const protocolTokens = await originalMethod.call(this, input)

    await resolveTokenArray(
      this,
      input.blockNumber,
      protocolTokens,
      (underlyingToken, protocolToken, underlyingRateRaw) => {
        underlyingToken.totalSupplyRaw =
          (protocolToken.totalSupplyRaw * underlyingRateRaw) /
          10n ** BigInt(protocolToken.decimals)
      },
    )

    return protocolTokens
  }

  return replacementMethod
}
