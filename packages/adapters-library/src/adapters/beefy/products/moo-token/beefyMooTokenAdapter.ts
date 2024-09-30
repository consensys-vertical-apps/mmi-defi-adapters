import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { breakdownFetcherMap, chainIdMap, protocolMap } from '../../sdk/config'
import {
  ApiClmManager,
  ApiVault,
  BeefyProductType,
  ProtocolUnwrapType,
} from '../../sdk/types'

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
  unwrapType: ProtocolUnwrapType
  underlyingLPToken: Erc20Metadata
}

export class BeefyMooTokenAdapter implements IProtocolAdapter {
  productId = BeefyProductType.MOO_TOKEN
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  protected provider: CustomJsonRpcProvider

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

  @CacheToDb()
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
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
    return await filterMapAsync(vaults, async (vault) => {
      const platformConfig = protocolMap[vault.platformId]
      const protocolType =
        vault.tokenAddress &&
        cowTokenAddresses.has(vault.tokenAddress.toLocaleLowerCase())
          ? 'beefy_clm'
          : typeof platformConfig === 'string' || !platformConfig
            ? platformConfig
            : platformConfig[vault.strategyTypeId || 'default']

      if (!protocolType) {
        logger.debug(
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
        return undefined
      }

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

      return {
        ...protocolToken,
        underlyingTokens: breakdownTokenMetadata,
        underlyingLPToken: underlyingToken,
        unwrapType: protocolType,
      }
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const {
      underlyingTokens,
      unwrapType,
      underlyingLPToken,
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    const vaultBalanceBreakdown = await breakdownFetcherMap[unwrapType](
      {
        protocolTokenAddress,
        underlyingLPTokenAddress: underlyingLPToken.address,
        blockSpec: { blockTag: blockNumber },
      },
      this.provider,
    )

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType['Protocol'],
      tokens: vaultBalanceBreakdown.balances.map((balance) => {
        const token = underlyingTokens.find(
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
            : (balance.vaultBalance * 10n ** BigInt(protocolToken.decimals)) /
              vaultBalanceBreakdown.vaultTotalSupply

        return {
          ...token,
          underlyingRateRaw,
          type: TokenType['Underlying'],
        }
      }),
    }
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
