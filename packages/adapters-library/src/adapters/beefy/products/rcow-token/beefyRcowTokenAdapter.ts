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
import { ApiClmRewardPool, BeefyProductType } from '../../sdk/types'
import { RcowMetadataEntry, TcowMetadata } from './types'

export class BeefyRcowTokenAdapter
  extends BeefyBaseAdapter<RcowMetadataEntry>
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = BeefyProductType.RCOW_TOKEN

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<TcowMetadata> {
    const chain = chainIdMap[this.chainId]

    const cowAdapter = this.adaptersController.fetchAdapter(
      this.chainId,
      this.protocolId,
      BeefyProductType.COW_TOKEN,
    )

    const cowAddressSet = new Set(
      (await cowAdapter.getProtocolTokens()).map((token) =>
        token.address.toLocaleLowerCase(),
      ),
    )

    const clmRewardPools = await fetch(
      `https://api.beefy.finance/gov-vaults/${chain}`,
    )
      .then((res) => res.json())
      .then((res) =>
        (res as ApiClmRewardPool[])
          .filter((g) => g.status === 'active')
          .filter((g) => g.chain === chain)
          .filter((g) => g.version === 2)
          .filter((g) => cowAddressSet.has(g.tokenAddress.toLocaleLowerCase())),
      )

    // for each vault, get the latest breakdown to get the token list
    const res: TcowMetadata = {}
    for (const clmRewardPool of clmRewardPools) {
      try {
        const [protocolToken, underlyingToken, ...rewardTokens] =
          await Promise.all([
            this.helpers.getTokenMetadata(clmRewardPool.earnContractAddress),
            this.helpers.getTokenMetadata(clmRewardPool.tokenAddress),
            ...clmRewardPool.earnedTokenAddresses.map((address) =>
              this.helpers.getTokenMetadata(address),
            ),
          ])

        res[protocolToken.address] = {
          protocolToken,
          underlyingToken,
          rewardTokens,
        }
      } catch (e) {
        logger.warn(
          {
            productId: this.productId,
            vaultId: clmRewardPool.id,
            platformId: clmRewardPool.platformId,
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

    const cowAdapter = this.adaptersController.fetchAdapter(
      this.chainId,
      this.protocolId,
      BeefyProductType.COW_TOKEN,
    )

    const cowTokenUwrapRes = await cowAdapter.unwrap({
      protocolTokenAddress: metadata.underlyingToken.address,
      tokenId,
      blockNumber,
    })

    return {
      ...metadata.protocolToken,
      baseRate: 1,
      type: TokenType['Protocol'],
      tokens: cowTokenUwrapRes.tokens,
    }
  }
}
