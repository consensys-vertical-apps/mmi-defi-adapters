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
import { breakdownFetcherMap, chainIdMap, protocolMap } from '../../sdk/config'
import { ApiClmManager, ApiVault, BeefyProductType } from '../../sdk/types'
import { MooMetadata, MooMetadataEntry } from './types'

export class BeefyMooTokenAdapter
  extends BeefyBaseAdapter<MooMetadataEntry>
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = BeefyProductType.MOO_TOKEN

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<MooMetadata> {
    const chain = chainIdMap[this.chainId]

    const cowTokenAddresses = await fetch(
      `https://api.beefy.finance/cow-vaults/${chain}`,
    )
      .then((res) => res.json())
      .then((res) =>
        (res as ApiClmManager[]).map((r) =>
          r.earnedTokenAddress.toLocaleLowerCase(),
        ),
      )
      .then((res) => new Set(res))

    const vaults = await fetch(`https://api.beefy.finance/vaults/${chain}`)
      .then((res) => res.json())
      .then((res) =>
        (res as ApiVault[])
          .filter((vault) => vault.chain === chain)
          // remove inactive vaults, might not be a good idea to remove them completely
          .filter((vault) => vault.status === 'active')
          // remove unsupported gov vaults
          .filter((vault) => vault.isGovVault !== true)
          // remove unsupported bridged vaults
          .filter((vault) => Object.keys(vault.bridged || {}).length === 0),
      )

    // for each vault, get the latest breakdown to get the token list
    const res: MooMetadata = {}
    for (const vault of vaults) {
      const platformConfig = protocolMap[vault.platformId]
      const protocolType =
        vault.tokenAddress &&
        cowTokenAddresses.has(vault.tokenAddress.toLocaleLowerCase())
          ? 'beefy_clm'
          : typeof platformConfig === 'string' || !platformConfig
            ? platformConfig
            : platformConfig[vault.strategyTypeId || 'default']

      if (!protocolType) {
        logger.warn(
          {
            productId: this.productId,
            vaultId: vault.id,
            platformId: vault.platformId,
            vaultAddress: vault.earnedTokenAddress,
            poolAddress: vault.tokenAddress,
            strategyTypeId: vault.strategyTypeId,
            chain,
          },
          'Protocol type not found',
        )
        continue
      }

      try {
        // test that we can indeed fetch the breakdown, otherwise we don't include the vault
        // in the list
        const [protocolToken, underlyingToken, breakdown] = await Promise.all([
          this.helpers.getTokenMetadata(vault.earnedTokenAddress),
          this.helpers.getTokenMetadata(vault.tokenAddress),
          breakdownFetcherMap[protocolType](
            {
              protocolTokenAddress: vault.earnedTokenAddress,
              underlyingLPTokenAddress: vault.tokenAddress,
              blockSpec: { blockTag: undefined },
            },
            this.provider,
          ),
        ])

        const breakdownTokenMetadata = await Promise.all(
          breakdown.balances.map((balance) =>
            this.helpers.getTokenMetadata(balance.tokenAddress),
          ),
        )

        res[protocolToken.address] = {
          protocolToken,
          underlyingTokens: breakdownTokenMetadata,
          underlyingLPToken: underlyingToken,
          unwrapType: protocolType,
        }
      } catch (e) {
        logger.warn(
          {
            productId: this.productId,
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

    const vaultBalanceBreakdown = await breakdownFetcherMap[
      metadata.unwrapType
    ](
      {
        protocolTokenAddress,
        underlyingLPTokenAddress: metadata.underlyingLPToken.address,
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
              productId: this.productId,
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
