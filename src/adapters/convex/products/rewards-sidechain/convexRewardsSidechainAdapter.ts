import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  ConvexFactorySidechain__factory,
  ConvexRewardFactorySidechain__factory,
} from '../../contracts'
import {
  ConvexExtraRewardAdapter,
  ConvexExtraRewardAdapterMetadata,
} from '../extra-reward/convexExtraRewardAdapter'

export class ConvexRewardsSidechainAdapter extends ConvexExtraRewardAdapter {
  productId = 'rewards-sidechain'

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const convexFactory = ConvexFactorySidechain__factory.connect(
      '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
      this.provider,
    )

    const length = await convexFactory.poolLength()

    const metadata: ConvexExtraRewardAdapterMetadata = {}
    await Promise.all(
      Array.from({ length: Number(length) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const rewardFactory = ConvexRewardFactorySidechain__factory.connect(
          convexData.rewards,
          this.provider,
        )

        const [convexToken, rewardLength] = await Promise.all([
          getTokenMetadata(convexData.rewards, this.chainId, this.provider), // convex staking contract is missing name, symbol, decimal
          rewardFactory.rewardLength(),
        ])

        const extraRewards: Erc20Metadata[] = []
        if (rewardLength > 0n) {
          await Promise.all(
            Array.from({ length: Number(rewardLength) }, async (_, i) => {
              const rewardToken = (await rewardFactory.rewards(i)).reward_token

              const rewardTokenMetadata = await getTokenMetadata(
                rewardToken,
                this.chainId,
                this.provider,
              )

              extraRewards.push(rewardTokenMetadata)
            }),
          )

          metadata[convexToken.address] = {
            protocolToken: convexToken,
            underlyingTokens: extraRewards,
          }
        }
      }),
    )

    return metadata
  }
}
