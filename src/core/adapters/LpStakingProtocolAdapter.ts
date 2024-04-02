import {
  GetPositionsInput,
  ProtocolPosition,
  GetEventsInput,
  MovementsByBlock,
  TokenBalance,
  Underlying,
  TokenType,
  UnwrappedTokenExchangeRate,
  GetPositionsInputWithTokenAddresses,
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

export type LpStakingProtocolMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
    extraRewardTokens: ExtraRewardToken[]
  }
>

export abstract class LpStakingAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  abstract buildMetadata(): Promise<LpStakingProtocolMetadata>

  abstract getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInputWithTokenAddresses): Promise<ProtocolPosition[]>

  abstract getExtraRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInputWithTokenAddresses): Promise<ProtocolPosition[]>

  abstract getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]>

  abstract getExtraRewardWithdrawals({
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
      this.getRewardWithdrawals,
      this.getExtraRewardWithdrawals,
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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  private async addTokensToPosition(
    position: ProtocolPosition,
    newPositions?: ProtocolPosition,
  ) {
    if (newPositions && newPositions.tokens && newPositions.tokens.length > 0) {
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
            this.getRewardPositions({
              userAddress,
              blockNumber,
              protocolTokenAddresses: [position.address],
            }),
            this.getExtraRewardPositions({
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
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    const pricePerShareRaw = BigInt(
      PRICE_PEGGED_TO_ONE * 10 ** protocolTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  protected async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
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
