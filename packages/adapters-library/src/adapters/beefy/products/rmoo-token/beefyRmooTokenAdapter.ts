import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { logger } from '../../../../core/utils/logger'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { BeefyBaseAdapter } from '../../sdk/beefyBaseAdapter'
import { chainIdMap } from '../../sdk/config'
import { ApiBoost, BeefyProductType } from '../../sdk/types'
import { RmooMetadata, RmooMetadataEntry } from './types'

export class BeefyRmooTokenAdapter
  extends BeefyBaseAdapter<RmooMetadataEntry>
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = BeefyProductType.RMOO_TOKEN

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<RmooMetadata> {
    const chain = chainIdMap[this.chainId]

    const mooAdapter = this.adaptersController.fetchAdapter(
      this.chainId,
      this.protocolId,
      BeefyProductType.MOO_TOKEN,
    )

    const mooAddressSet = new Set(
      (await mooAdapter.getProtocolTokens()).map((token) =>
        token.address.toLocaleLowerCase(),
      ),
    )

    const mooRewardPools = await fetch(
      `https://api.beefy.finance/boosts/${chain}`,
    )
      .then((res) => res.json())
      .then((res) =>
        (res as ApiBoost[])
          .filter((g) => g.status === 'active')
          .filter((g) => g.chain === chain)
          .filter((g) => g.version === 2)
          .filter((g) => mooAddressSet.has(g.tokenAddress.toLocaleLowerCase())),
      )

    // for each vault, get the latest breakdown to get the token list
    const res: RmooMetadata = {}
    for (const mooRewardPool of mooRewardPools) {
      try {
        const [protocolToken, underlyingToken, rewardToken] = await Promise.all(
          [
            this.helpers.getTokenMetadata(mooRewardPool.earnContractAddress),
            this.helpers.getTokenMetadata(mooRewardPool.tokenAddress),
            this.helpers.getTokenMetadata(mooRewardPool.earnedTokenAddress),
          ],
        )

        res[protocolToken.address] = {
          protocolToken,
          underlyingToken,
          rewardTokens: [rewardToken],
        }
      } catch (e) {
        logger.warn(
          {
            productId: this.productId,
            vaultId: mooRewardPool.id,
            chain,
            error: e,
          },
          'Failed to fetch metadata',
        )
      }
    }

    return res
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const metadata = await this.fetchPoolMetadata(protocolTokenAddress)

    const mooAdapter = this.adaptersController.fetchAdapter(
      this.chainId,
      this.protocolId,
      BeefyProductType.MOO_TOKEN,
    )

    const mooTokenUwrapRes = await mooAdapter.unwrap({
      protocolTokenAddress: metadata.underlyingToken.address,
      tokenId,
      blockNumber,
    })

    return {
      ...metadata.protocolToken,
      baseRate: 1,
      type: TokenType['Protocol'],
      tokens: mooTokenUwrapRes.tokens,
    }
  }
}
