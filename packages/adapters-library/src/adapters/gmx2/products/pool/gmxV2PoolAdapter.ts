import { AbiCoder, getAddress, getBytes, keccak256 } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  MovementsByBlockReward,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { DataStore__factory, Reader__factory } from '../../contracts'

const contractAddresses: Partial<
  Record<Chain, { dataStore: string; reader: string }>
> = {
  [Chain.Arbitrum]: {
    dataStore: '0xfd70de6b91282d8017aa4e741e9ae325cab992d8',
    reader: '0x23d4da5c7c6902d4c86d551cae60d5755820df9e',
  },
  [Chain.Avalanche]: {
    dataStore: '0x2F0b22339414ADeD7D5F06f9D604c7fF5b2fe3f6',
    reader: '0x95861eecD91Cb30220598DdA68268E7c1F1A1386',
  },
}

const MARKET_LIST_DATASTORE_KEY = 'MARKET_LIST'

/**
 * Update me.
 * Add additional metadata or delete type
 */
type AdditionalMetadata = {}

export class GmxV2PoolAdapter implements IProtocolAdapter {
  productId = 'pool'
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
      name: 'GmxV2',
      description: 'GmxV2 defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const dataStore = DataStore__factory.connect(
      contractAddresses[this.chainId]!.dataStore,
      this.provider,
    )
    const totalMarkets = await dataStore.getAddressCount(
      this.hashString(MARKET_LIST_DATASTORE_KEY),
    )

    const reader = Reader__factory.connect(
      contractAddresses[this.chainId]!.reader,
      this.provider,
    )

    const markets = await reader.getMarkets(
      contractAddresses[this.chainId]!.dataStore,
      0,
      totalMarkets,
    )

    return await Promise.all(
      markets.map(async (market) => {
        const [marketTokenMetadata, longTokenMetadata, shortTokenMetadata] =
          await Promise.all([
            this.helpers.getTokenMetadata(market.marketToken),
            this.helpers.getTokenMetadata(market.longToken),
            this.helpers.getTokenMetadata(market.shortToken),
          ])

        return {
          ...marketTokenMetadata,
          name: `${marketTokenMetadata.name} ${longTokenMetadata.symbol}/${shortTokenMetadata.symbol}`,
          symbol: `${marketTokenMetadata.symbol}/${longTokenMetadata.symbol}/${shortTokenMetadata.symbol}`,
          underlyingTokens: [longTokenMetadata, shortTokenMetadata],
        }
      }),
    )
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
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

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapTokenAsRatio({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
      blockNumber,
    })
  }

  private hashString(value: string) {
    const bytes = AbiCoder.defaultAbiCoder().encode(['string'], [value])
    return keccak256(getBytes(bytes))
  }
}
