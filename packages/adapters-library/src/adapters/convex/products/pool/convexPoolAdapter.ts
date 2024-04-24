import { getAddress } from 'ethers'
import {
  LpStakingAdapter,
  LpStakingProtocolMetadata,
} from '../../../../core/adapters/LpStakingProtocolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolDetails,
  PositionType,
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  MovementsByBlock,
  ProtocolPosition,
} from '../../../../types/adapter'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants'
import { ConvexFactory__factory } from '../../contracts'

/**
 * First version of Convex had additional token which needed to be staked to accrue rewards
 */
export class ConvexPoolAdapter
  extends LpStakingAdapter
  implements IMetadataBuilder
{
  productId = 'pool'

  async getRewardPositions(
    _input: GetPositionsInput,
  ): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }
  async getExtraRewardPositions(
    _input: GetPositionsInput,
  ): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }

  getRewardWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }
  getExtraRewardWithdrawals(
    _input: GetEventsInput,
  ): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  @CacheToFile({ fileKey: 'metadata' })
  async buildMetadata() {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    const pools = await convexFactory.poolLength()

    const metadata: LpStakingProtocolMetadata = {}
    await Promise.all(
      Array.from({ length: Number(pools) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const [convexToken, underlyingToken] = await Promise.all([
          getTokenMetadata(convexData.token, this.chainId, this.provider),
          getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
        ])

        metadata[getAddress(convexData.token)] = {
          protocolToken: convexToken,
          underlyingToken,
          extraRewardTokens: [],
        }
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
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }
}
