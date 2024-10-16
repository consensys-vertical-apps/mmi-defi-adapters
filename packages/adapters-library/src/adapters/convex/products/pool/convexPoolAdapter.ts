import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter.js'
import { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import { NotImplementedError } from '../../../../core/errors/errors.js'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl.js'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata.js'
import type { ProtocolToken } from '../../../../types/IProtocolAdapter.js'
import {
  type GetEventsInput,
  type GetPositionsInput,
  type MovementsByBlock,
  PositionType,
  type ProtocolDetails,
  type ProtocolPosition,
  TokenType,
  type UnwrappedTokenExchangeRate,
} from '../../../../types/adapter.js'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants.js'
import { ConvexFactory__factory } from '../../contracts/index.js'

const PRICE_PEGGED_TO_ONE = 1

export class ConvexPoolAdapter extends SimplePoolAdapter {
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

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    const pools = await convexFactory.poolLength()

    const metadata: ProtocolToken[] = []
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
