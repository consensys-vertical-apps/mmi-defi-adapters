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
import { Protocol } from '../../../protocols'
import { breakdownFetcherMap, chainIdMap } from '../../sdk/config'
import { ApiClmManager, BeefyProductType } from '../../sdk/types'

export class BeefyCowTokenAdapter implements IProtocolAdapter {
  productId = BeefyProductType.COW_TOKEN
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
  async getProtocolTokens(): Promise<ProtocolToken[]> {
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
    return await filterMapAsync(vaults, async (vault) => {
      if (
        !vault.depositTokenAddresses ||
        vault.depositTokenAddresses.length < 2
      ) {
        logger.debug(
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
        return undefined
      }
      const token0 = vault.depositTokenAddresses[0] as string
      const token1 = vault.depositTokenAddresses[1] as string
      const [protocolToken, underlyingToken0, underlyingToken1] =
        await Promise.all([
          this.helpers.getTokenMetadata(vault.earnedTokenAddress),
          this.helpers.getTokenMetadata(token0),
          this.helpers.getTokenMetadata(token1),
        ])

      return {
        ...protocolToken,
        underlyingTokens: [underlyingToken0, underlyingToken1],
      }
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const vaultBalanceBreakdown = await breakdownFetcherMap['beefy_clm'](
      {
        protocolTokenAddress,
        underlyingLPTokenAddress: protocolTokenAddress,
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
  ): Promise<ProtocolToken> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
