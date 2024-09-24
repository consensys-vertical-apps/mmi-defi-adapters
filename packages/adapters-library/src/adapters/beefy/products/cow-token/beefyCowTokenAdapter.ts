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
import { breakdownFetcherMap, chainIdMap } from '../../sdk/config'
import { ApiClmManager, BeefyProductType } from '../../sdk/types'
import { CowMetadata, CowMetadataEntry } from './types'

export class BeefyCowTokenAdapter
  extends BeefyBaseAdapter<CowMetadataEntry>
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = BeefyProductType.COW_TOKEN

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<CowMetadata> {
    const chain = chainIdMap[this.chainId]

    const vaults = await fetch(`https://api.beefy.finance/cow-vaults/${chain}`)
      .then((res) => res.json())
      .then((res) =>
        (res as ApiClmManager[])
          .filter((vault) => vault.chain === chain)
          // remove inactive vaults, might not be a good idea to remove them completely
          .filter((vault) => vault.status === 'active')
          // remove unsupported gov vaults
          .filter((vault) => vault.type === 'cowcentrated'),
      )

    // for each vault, get the latest breakdown to get the token list
    const res: CowMetadata = {}
    for (const vault of vaults) {
      try {
        if (
          !vault.depositTokenAddresses ||
          vault.depositTokenAddresses.length < 2
        ) {
          logger.error(
            {
              vaultId: vault.id,
              platformId: vault.platformId,
              vaultAddress: vault.earnedTokenAddress,
              poolAddress: vault.tokenAddress,
              strategyTypeId: vault.strategyTypeId,
              depositTokenAddresses: vault.depositTokenAddresses,
              chain,
            },
            'Invalid deposit token list',
          )
          continue
        }
        const token0 = vault.depositTokenAddresses[0] as string
        const token1 = vault.depositTokenAddresses[1] as string
        const [protocolToken, underlyingToken0, underlyingToken1] =
          await Promise.all([
            this.helpers.getTokenMetadata(vault.earnedTokenAddress),
            this.helpers.getTokenMetadata(token0),
            this.helpers.getTokenMetadata(token1),
          ])

        res[protocolToken.address] = {
          protocolToken,
          underlyingTokens: [underlyingToken0, underlyingToken1],
        }
      } catch (e) {
        logger.warn(
          {
            vaultId: vault.id,
            platformId: vault.platformId,
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

    const vaultBalanceBreakdown = await breakdownFetcherMap['beefy_clm'](
      {
        protocolTokenAddress,
        underlyingLPTokenAddress: protocolTokenAddress,
        blockSpec: { blockTag: blockNumber },
      },
      this.provider,
    )

    return {
      ...metadata.protocolToken,
      baseRate: 1,
      type: TokenType['Protocol'],
      tokens: vaultBalanceBreakdown.balances.map((balance) => {
        const token = metadata.underlyingTokens.find(
          (token) => token.address === balance.tokenAddress,
        )
        if (!token) {
          logger.error(
            {
              tokenAddress: balance.tokenAddress,
              protocolTokenAddress,
              protocol: this.protocolId,
              chainId: this.chainId,
              product: this.productId,
            },
            'Token not found',
          )
          throw new Error('Token not found')
        }

        const underlyingRateRaw =
          vaultBalanceBreakdown.vaultTotalSupply === 0n
            ? 0n
            : (balance.vaultBalance *
                10n ** BigInt(metadata.protocolToken.decimals)) /
              vaultBalanceBreakdown.vaultTotalSupply

        return {
          ...token,
          underlyingRateRaw,
          type: TokenType['Underlying'],
        }
      }),
    }
  }
}
