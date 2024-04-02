import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { AddClaimableRewards } from '../../../../core/decorators/addClaimableRewards'
import { AddClaimedRewards } from '../../../../core/decorators/addClaimedRewards'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { logger } from '../../../../core/utils/logger'
import {
  ProtocolDetails,
  PositionType,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  TokenBalance,
  ProtocolTokenTvl,
  UnwrappedTokenExchangeRate,
  Underlying,
  ProtocolAdapterParams,
  TokenType,
  GetPositionsInput,
  ProtocolPosition,
  AssetType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  CurveStakingAdapterMetadata,
  queryCurveGauges,
} from '../../common/getPoolData'

const PRICE_PEGGED_TO_ONE = 1
export class CurveStakingAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'staking'

  constructor(params: ProtocolAdapterParams) {
    super(params)
  }

  @AddClaimableRewards({ rewardAdapterIds: ['reward'] })
  getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return super.getPositions(input)
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Curve staking',
      description: 'Curve staking adapter',
      siteUrl: 'https://curve.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/crv.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return queryCurveGauges(this.chainId, this.provider)
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenBalance.address,
    )

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: protocolTokenBalance.balanceRaw,
      },
    ]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    // Stake tokens always pegged one to one to underlying
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

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const [underlyingLpToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenAddress,
    )

    const protocolToken = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )

    //// curve staking contracts dont have transfer events so use underlying lp token events instead
    const movements = await this.getProtocolTokenMovements({
      protocolToken: underlyingLpToken!,

      filter: {
        fromBlock,
        toBlock,
        from: userAddress,
        to: protocolTokenAddress,
      },
    })

    movements.forEach((movement) => {
      movement.protocolToken = protocolToken
    })

    return movements
  }

  @AddClaimedRewards({ rewardAdapterIds: ['reward'] })
  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const [underlyingLpToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenAddress,
    )

    const protocolToken = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )

    //// curve staking contracts dont have transfer events so use underlying lp token events instead
    const movements = await this.getProtocolTokenMovements({
      protocolToken: underlyingLpToken!,

      filter: {
        fromBlock,
        toBlock,
        from: protocolTokenAddress,
        to: userAddress,
      },
    })

    movements.forEach((movement) => {
      movement.protocolToken = protocolToken
    })

    return movements
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return underlyingTokens
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
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

  async fetchGauge(
    protocolTokenAddress: string,
  ): Promise<CurveStakingAdapterMetadata[Key]> {
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
}

type Key = keyof CurveStakingAdapterMetadata
