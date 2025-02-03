import { AbiCoder, getBytes, keccak256 } from 'ethers'
import { mulDivHalfUp } from 'evm-maths/lib/utils'
import { Erc20__factory } from '../../../../contracts'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
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

type UnderlyingTokenMetadata = Erc20Metadata & {
  position: 'long' | 'short' | 'both'
}

type AdditionalMetadata = {
  underlyingTokens: UnderlyingTokenMetadata[]
}

export class GmxV2GmPoolAdapter implements IProtocolAdapter {
  productId = 'gm-pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: false,
    userEvent: 'Transfer',
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'GMX V2',
      description: 'GM V2 Pool adapter',
      siteUrl: 'https://app.gmx.io/#/pools',
      iconUrl:
        'https://gmx.io//static/media/ic_gmx_40.72a1053e8344ef876100ac72aff70ead.svg',
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

    // This is where the number of markets is stored
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

        const underlyingTokens: UnderlyingTokenMetadata[] =
          longTokenMetadata.address === shortTokenMetadata.address
            ? [
                {
                  ...longTokenMetadata,
                  position: 'both',
                },
              ]
            : [
                {
                  ...longTokenMetadata,
                  position: 'long',
                },
                {
                  ...shortTokenMetadata,
                  position: 'short',
                },
              ]

        return {
          ...marketTokenMetadata,
          name: `${marketTokenMetadata.name} ${longTokenMetadata.symbol}/${shortTokenMetadata.symbol}`,
          symbol: `${marketTokenMetadata.symbol}/${longTokenMetadata.symbol}/${shortTokenMetadata.symbol}`,
          underlyingTokens: underlyingTokens,
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

  /**
   * There are two ways of fetching underlying balances
   * First and official way is to use Reader.getWithdrawalAmountOut
   * This way requires passing market prices, which can be fetched by:
   * - Their API https://arbitrum-api.gmxinfra2.io/prices/tickers
   * - searching for the latest EventLog1 with topic1 = 'OraclePriceUpdate' and topic2 = toBytes32(marketToken)
   * - somehow signing a valid payload for the chainlink oracle to fetch the price
   *
   * The second way is to get the user balance share of the market token and apply it to the underlying total amounts
   */
  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    const protocolTokenBalances = await this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens,
    })

    const dataStore = DataStore__factory.connect(
      contractAddresses[this.chainId]!.dataStore,
      this.provider,
    )

    return await Promise.all(
      protocolTokenBalances.map(async (position) => {
        const { underlyingTokens } = protocolTokens.find(
          (token) => token.address === position.address,
        )!
        const longToken = underlyingTokens.find(
          (token) => token.position === 'long' || token.position === 'both',
        )!
        const shortToken = underlyingTokens.find(
          (token) => token.position === 'short' || token.position === 'both',
        )!

        const marketToken = Erc20__factory.connect(
          position.address,
          this.provider,
        )

        const [
          marketTokenTotalSupply,
          longTokenPoolAmountRaw,
          shortTokenPoolAmountRaw,
        ] = await Promise.all([
          marketToken.totalSupply(),
          dataStore.getUint(
            this.hashPoolAmount(position.address, longToken.address),
          ),
          dataStore.getUint(
            this.hashPoolAmount(position.address, shortToken.address),
          ),
        ])

        const longTokenShare = mulDivHalfUp(
          longTokenPoolAmountRaw,
          position.balanceRaw,
          marketTokenTotalSupply,
        )
        const shortTokenShare = mulDivHalfUp(
          shortTokenPoolAmountRaw,
          position.balanceRaw,
          marketTokenTotalSupply,
        )

        // if the longToken and shortToken are the same, only return one token
        if (longToken.address === shortToken.address) {
          return {
            ...position,
            tokens: [
              {
                address: longToken.address,
                name: longToken.name,
                symbol: longToken.symbol,
                decimals: longToken.decimals,
                balanceRaw: longTokenShare,
                type: TokenType.Underlying,
              },
            ],
          }
        }

        return {
          ...position,
          tokens: [
            {
              address: longToken.address,
              name: longToken.name,
              symbol: longToken.symbol,
              decimals: longToken.decimals,
              balanceRaw: longTokenShare,
              type: TokenType.Underlying,
            },
            {
              address: shortToken.address,
              name: shortToken.name,
              symbol: shortToken.symbol,
              decimals: shortToken.decimals,
              balanceRaw: shortTokenShare,
              type: TokenType.Underlying,
            },
          ],
        }
      }),
    )
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
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private hashString(value: string) {
    const bytes = AbiCoder.defaultAbiCoder().encode(['string'], [value])
    return keccak256(getBytes(bytes))
  }

  private hashPoolAmount(market: string, token: string): string {
    const innerHash = keccak256(
      AbiCoder.defaultAbiCoder().encode(['string'], ['POOL_AMOUNT']),
    )
    return keccak256(
      AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'address'],
        [innerHash, market, token],
      ),
    )
  }

  private halfBigInt(value: bigint) {
    return value % 2n === 0n ? value / 2n : (value + 1n) / 2n
  }
}
