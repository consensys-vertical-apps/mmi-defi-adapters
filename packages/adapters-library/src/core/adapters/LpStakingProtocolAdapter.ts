import { ProtocolToken } from '../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetPositionsInputWithTokenAddresses,
  MovementsByBlock,
  ProtocolPosition,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { IMetadataBuilder } from '../decorators/cacheToFile'
import { NotImplementedError } from '../errors/errors'
import { logger } from '../utils/logger'
import { SimplePoolAdapter } from './SimplePoolAdapter'

const PRICE_PEGGED_TO_ONE = 1

export type ExtraRewardToken = {
  token: Erc20Metadata
  manager: string
}

export type LpStakingProtocolMetadata = {
  underlyingTokens: Erc20Metadata[]
  extraRewardTokens: ExtraRewardToken[]
}

export abstract class LpStakingAdapter extends SimplePoolAdapter<LpStakingProtocolMetadata> {
  abstract getRewardPositionsLpStakingAdapter({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInputWithTokenAddresses): Promise<ProtocolPosition[]>

  abstract getExtraRewardPositionsLpStakingAdapter({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInputWithTokenAddresses): Promise<ProtocolPosition[]>

  abstract getRewardWithdrawalsLpStakingAdapter({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]>

  abstract getExtraRewardWithdrawalsLpStakingAdapter({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]>

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const withdrawalMethods = [
      super.getWithdrawals,
      this.getRewardWithdrawalsLpStakingAdapter,
      this.getExtraRewardWithdrawalsLpStakingAdapter,
    ]

    const withdrawals = await Promise.all(
      withdrawalMethods.map(async (method) => {
        try {
          return await method.call(this, {
            userAddress,
            protocolTokenAddress,
            fromBlock,
            toBlock,
          })
        } catch (error) {
          this.handleError(error, method.name)
        }
      }),
    )

    return withdrawals
      .flat()
      .filter(
        (withdrawal): withdrawal is MovementsByBlock =>
          withdrawal !== undefined,
      )
  }

  abstract getProtocolTokens(): Promise<
    ProtocolToken<LpStakingProtocolMetadata>[]
  >

  private async addTokensToPosition(
    position: ProtocolPosition,
    newPositions?: ProtocolPosition,
  ) {
    if (newPositions?.tokens && newPositions.tokens.length > 0) {
      position.tokens = [...(position.tokens ?? []), ...newPositions.tokens]
    }
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const stakingPositions = await super.getPositions({
      userAddress,
      blockNumber,
      protocolTokenAddresses,
    })

    await Promise.all(
      stakingPositions.map(async (position) => {
        const [rewardTokensPositions, extraRewardTokensPositions] =
          await Promise.allSettled([
            this.getRewardPositionsLpStakingAdapter({
              userAddress,
              blockNumber,
              protocolTokenAddresses: [position.address],
            }),
            this.getExtraRewardPositionsLpStakingAdapter({
              userAddress,
              blockNumber,
              protocolTokenAddresses: [position.address],
            }),
          ])

        if (rewardTokensPositions.status === 'fulfilled') {
          this.addTokensToPosition(position, rewardTokensPositions.value[0])
        } else {
          this.handleError(rewardTokensPositions.reason, 'getRewardPositions')
        }

        if (extraRewardTokensPositions.status === 'fulfilled') {
          this.addTokensToPosition(
            position,
            extraRewardTokensPositions.value[0],
          )
        } else {
          this.handleError(
            extraRewardTokensPositions.reason,
            'getExtraRewardPositions',
          )
        }
      }),
    )

    return stakingPositions
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingTokens[0]!,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const protocolToken =
      await this.fetchProtocolTokenMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      protocolTokenMetadata.address,
    )

    const pricePerShareRaw = BigInt(
      PRICE_PEGGED_TO_ONE * 10 ** protocolTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingTokens[0]!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const underlyingTokens =
      await this.fetchUnderlyingTokensMetadata(protocolTokenAddress)

    return underlyingTokens
  }

  private handleError(error: unknown, methodName: string) {
    if (!(error instanceof NotImplementedError)) {
      logger.error(
        error,
        `An error has occurred method: ${methodName} chainId: ${this.chainId}`,
      )
      throw new Error(
        `An error has occurred method: ${methodName} chainId: ${this.chainId}`,
      )
    }
  }
}
