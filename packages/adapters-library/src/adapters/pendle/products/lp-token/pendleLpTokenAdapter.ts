import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { Replacements } from '../../../../scripts/replacements'
import { RewardsAdapter } from '../../../../scripts/rewardAdapter'
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
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { fetchAllMarkets } from '../../backend/backendSdk'
import {
  DURATION_15_MINS,
  DURATION_30_MINS,
  PENDLE_ORACLE_ADDRESS_ALL_CHAINS,
} from '../../backend/constants'
import { OraclePyYtLp__factory } from '../../contracts'

type Metadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
    marketAddress: string
  }
>

export class PendleLpTokenAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'lp-token'
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
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Pendle',
      description: 'Pendle defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'market' })
  async buildMetadata(): Promise<Metadata> {
    const resp = await fetchAllMarkets(this.chainId)

    const metadata: Metadata = {}

    resp.results.map((value) => {
      const market = getAddress(value.address)

      const lp: Erc20Metadata = {
        address: getAddress(value.lp.address),
        name: value.lp.name,
        symbol: value.lp.symbol,
        decimals: value.lp.decimals,
      }
      const underlyingAsset: Erc20Metadata = {
        address: getAddress(value.underlyingAsset.address),
        name: value.underlyingAsset.name,
        symbol: value.underlyingAsset.symbol,
        decimals: value.underlyingAsset.decimals,
      }

      metadata[getAddress(lp.address)] = {
        protocolToken: lp,
        underlyingTokens: [underlyingAsset],
        marketAddress: market,
      }

      return
    })

    return metadata
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
    blockNumber,
    protocolTokenAddress,
    tokenId,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const metadata = await this.fetchPoolMetadata(protocolTokenAddress)
    const underlyingToken = (
      await this.getUnderlyingTokens(protocolTokenAddress)
    )[0]!

    const oracle = OraclePyYtLp__factory.connect(
      PENDLE_ORACLE_ADDRESS_ALL_CHAINS,
      this.provider,
    )

    const rate: bigint = await oracle
      .getLpToSyRate(metadata.marketAddress, DURATION_15_MINS, {
        blockTag: blockNumber,
      })
      .catch((e) => {
        return oracle.getLpToSyRate(metadata.marketAddress, DURATION_30_MINS, {
          blockTag: blockNumber,
        })
      })

    const underlying = {
      type: TokenType.Underlying,

      underlyingRateRaw: rate,
      ...underlyingToken,
    }

    return {
      baseRate: 1,
      type: TokenType.Protocol,
      ...metadata.protocolToken,
      tokens: [underlying],
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
}
