import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
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
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { BeefyVaultV7__factory } from '../../contracts'
import { chainIdMap } from '../../sdk/config'
import {
  ApiClmManager,
  ApiVault,
  BeefyProductType,
} from '../../sdk/types'

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

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const chain = chainIdMap[this.chainId]


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

      try {
        const [protocolToken, underlyingToken] = await Promise.all([
          this.helpers.getTokenMetadata(vault.earnedTokenAddress),
          this.helpers.getTokenMetadata(vault.tokenAddress),
        ])

        return {
          ...protocolToken,
          underlyingTokens: [underlyingToken],
        }
      } catch (error) {
        return
      }
    })
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolTokenMetadata =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const underlyingTokenConversionRate = await this.unwrapProtocolToken(
      protocolTokenMetadata,
      blockNumber,
    )

    return {
      ...protocolTokenMetadata,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: underlyingTokenConversionRate,
    }
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.getUnderlyingTokens(
      protocolTokenMetadata.address,
    )

    const wstEthContract = BeefyVaultV7__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const pricePerShareRaw = await wstEthContract.getPricePerFullShare({
      blockTag: blockNumber,
    })

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }

  protected async getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return underlyingTokens
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
