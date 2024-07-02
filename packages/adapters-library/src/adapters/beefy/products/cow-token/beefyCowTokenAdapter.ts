import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { breakdownFetcherMap, chainIdMap, protocolMap } from '../../sdk/config'
import { ApiVault } from '../../sdk/types'
import { Metadata } from './types'

export class BeefyCowTokenAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'cow-token'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  /**
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Beefy',
      description: 'Beefy defi adapter',
      siteUrl: 'https://beefy.com',
      iconUrl: 'https://beefy.com/icons/icon-96x96.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<Metadata> {
    const vaults = (await (
      await fetch('https://api.beefy.finance/cow-vaults')
    ).json()) as ApiVault[]

    const chain = chainIdMap[this.chainId]
    const supportedVaults = vaults
      .filter((vault) => vault.chain === chain)
      // remove inactive vaults, might not be a good idea to remove them completely
      .filter((vault) => vault.status === 'active')
      // remove unsupported gov vaults
      .filter((vault) => vault.isGovVault !== true)
      // remove those where we token breakdown isn't implemented
      .filter((vault) => {
        const keep = !!protocolMap[vault.platformId]
        if (!keep) {
          logger.debug(
            {
              vaultId: vault.id,
              platformId: vault.platformId,
              vaultAddress: vault.earnedTokenAddress,
              poolAddress: vault.tokenAddress,
              strategyTypeId: vault.strategyTypeId,
              chain,
            },
            'Protocol type not implemented',
          )
        }
        return keep
      })

    // for each vault, get the latest breakdown to get the token list
    const res: Metadata = {}
    for (const vault of supportedVaults) {
      const platformConfig = protocolMap[vault.platformId]
      const protocolType =
        typeof platformConfig === 'string'
          ? platformConfig
          : platformConfig[vault.strategyTypeId || 'default']
      if (!protocolType) {
        logger.warn(
          {
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
          unwrapType: protocolType,
        }
      } catch (e) {
        logger.error(
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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
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

  private async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }
  private async getUnderlyingTokens(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).underlyingTokens
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    // boosts not supported yet
    return []
  }

  async getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    // boosts not supported yet
    return []
  }

  async getExtraRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    // boosts not supported yet
    return []
  }

  async getExtraRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    // boosts not supported yet
    return []
  }
}
