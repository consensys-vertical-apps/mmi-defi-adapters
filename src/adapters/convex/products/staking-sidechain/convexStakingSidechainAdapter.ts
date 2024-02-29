import { getAddress } from 'ethers'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { ConvexFactorySidechain__factory } from '../../contracts'
import {
  ConvexStakingAdapter,
  ConvexStakingAdapterMetadata,
} from '../staking/convexStakingAdapter'
import { AddClaimableRewards } from '../../../../core/decorators/addClaimableRewards'
import { AddClaimedRewards } from '../../../../core/decorators/addClaimedRewards'
import { GetPositionsInput, ProtocolPosition } from '../../../../types/adapter'

export class ConvexStakingSidechainAdapter extends ConvexStakingAdapter {
  productId = 'staking-sidechain'

  @AddClaimableRewards({ rewardAdapterIds: ['rewards-sidechain'] })
  getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return super.getPositionsWithoutRewards(input)
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const convexFactory = ConvexFactorySidechain__factory.connect(
      '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
      this.provider,
    )

    const length = await convexFactory.poolLength()

    const metadata: ConvexStakingAdapterMetadata = {}
    await Promise.all(
      Array.from({ length: Number(length) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const [convexToken, underlyingToken] = await Promise.all([
          getTokenMetadata(convexData.rewards, this.chainId, this.provider), // convex staking contract is missing name, symbol, decimal
          getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
        ])

        metadata[getAddress(convexToken.address)] = {
          protocolToken: {
            ...convexToken,
          },
          underlyingToken,
        }
      }),
    )

    return metadata
  }
}
