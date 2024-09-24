import { getAddress } from 'ethers'

import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  ProtocolPosition,
  TokenBalance,
  TokenType,
  Underlying,
  UnderlyingReward,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants'
import { ConvexFactory__factory } from '../../contracts'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'

const PRICE_PEGGED_TO_ONE = 1

export type ExtraRewardToken = {
  token: Erc20Metadata
  manager: string
}

export type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
  extraRewardTokens: ExtraRewardToken[]
}

export class ConvexPoolAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'pool'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number,
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

  async getRewardPositionsLpStakingAdapter(
    _input: GetPositionsInput,
  ): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }
  async getExtraRewardPositionsLpStakingAdapter(
    _input: GetPositionsInput,
  ): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }

  getRewardWithdrawalsLpStakingAdapter(
    _input: GetEventsInput,
  ): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }
  getExtraRewardWithdrawalsLpStakingAdapter(
    _input: GetEventsInput,
  ): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  @CacheToDb()
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    const pools = await convexFactory.poolLength()

    const metadata: ProtocolToken<AdditionalMetadata>[] = []
    await Promise.all(
      Array.from({ length: Number(pools) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const [convexToken, underlyingToken] = await Promise.all([
          getTokenMetadata(convexData.token, this.chainId, this.provider),
          getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
        ])

        metadata.push({
          ...convexToken,
          underlyingTokens: [underlyingToken],
          extraRewardTokens: [],
        })
      }),
    )

    return metadata
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https://www.convexfinance.com/',
      iconUrl: buildTrustAssetIconUrl(
        Chain.Ethereum,
        '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
      ),
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
