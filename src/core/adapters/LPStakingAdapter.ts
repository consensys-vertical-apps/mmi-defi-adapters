import {
  GetPositionsInput,
  ProtocolPosition,
  GetEventsInput,
  MovementsByBlock,
  TokenBalance,
  Underlying,
  TokenType,
  UnderlyingTokenRate,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { IMetadataBuilder } from '../decorators/cacheToFile'
import {
  ResolveUnderlyingMovements,
  ResolveUnderlyingPositions,
} from '../decorators/resolveUnderlyingPositions'
import { NotImplementedError } from '../errors/errors'
import { logger } from '../utils/logger'
import { SimplePoolAdapter } from './SimplePoolAdapter'

const PRICE_PEGGED_TO_ONE = 1

export type LpStakingProtocolMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
    rewardTokens?: Erc20Metadata[]
    extraRewardTokens?: Erc20Metadata[]
    extraRewardTokenManagers?: string[]
  }
>

export abstract class LPStakingAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
<<<<<<< HEAD
  abstract buildMetadata(): Promise<LpStakingProtocolMetadata>
=======
  abstract buildMetadata(): Promise<StakingProtocolMetadata>
>>>>>>> 81ee7b4 (feat: staking)

  abstract getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]>

  abstract getExtraRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]>

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

  @ResolveUnderlyingMovements
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
          this.handleError(error)
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

<<<<<<< HEAD
  private async addTokensToPosition(
=======
  async addTokensToPosition(
>>>>>>> 81ee7b4 (feat: staking)
    position: ProtocolPosition,
    newPositions?: ProtocolPosition,
  ) {
    if (newPositions && newPositions.tokens && newPositions.tokens.length > 0) {
      position.tokens = [...(position.tokens ?? []), ...newPositions.tokens]
    }
  }

  @ResolveUnderlyingPositions
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

    const positionPromises = stakingPositions.map(async (position) => {
      const rewardTokensPositionsPromise = this.getRewardPositions({
        userAddress,
        blockNumber,
        protocolTokenAddresses: [position.address],
      })

      const extraRewardTokensPositionsPromise = this.getExtraRewardPositions({
        userAddress,
        blockNumber,
        protocolTokenAddresses: [position.address],
      })

      const [[rewardTokensPositions], [extraRewardTokensPositions]] =
        await Promise.all([
          rewardTokensPositionsPromise,
          extraRewardTokensPositionsPromise,
        ])

      this.addTokensToPosition(position, rewardTokensPositions)
      this.addTokensToPosition(position, extraRewardTokensPositions)
    })

    try {
      await Promise.all(positionPromises)
    } catch (error) {
      this.handleError(error)
    }

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

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
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

<<<<<<< HEAD
  protected async fetchPoolMetadata(protocolTokenAddress: string) {
=======
  async fetchPoolMetadata(protocolTokenAddress: string) {
>>>>>>> 81ee7b4 (feat: staking)
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

  private handleError(error: unknown) {
    if (!(error instanceof NotImplementedError)) {
      logger.error(error, 'An error has occurred')
      throw new Error('An error occurred')
    }
  }
}
