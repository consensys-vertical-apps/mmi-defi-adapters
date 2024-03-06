import {
  LPStakingAdapter,
  LpStakingProtocolMetadata,
} from '../../../../core/adapters/LPStakingAdapter'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import {
  ProtocolDetails,
  PositionType,
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  MovementsByBlock,
  ProtocolPosition,
  GetAprInput,
  ProtocolTokenApr,
  GetApyInput,
  ProtocolTokenApy,
} from '../../../../types/adapter'

export class TestLpStakingAdapterPoolAdapter
  extends LPStakingAdapter
  implements IMetadataBuilder
{
  productId = 'pool'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'TestLpStakingAdapter',
      description: 'TestLpStakingAdapter pool adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }
  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return {} as LpStakingProtocolMetadata
  }

  getRewardPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }
  getExtraRewardPositions(
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

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }
}
