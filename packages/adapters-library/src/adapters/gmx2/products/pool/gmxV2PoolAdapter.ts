import { AbiCoder, getBytes, keccak256 } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
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
import { DataStore__factory, Reader__factory } from '../../contracts'
import { Erc20__factory } from '../../../../contracts'
import { mulDivHalfUp } from 'evm-maths/lib/utils'

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

export class GmxV2PoolAdapter implements IProtocolAdapter {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: false,
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

        const marketTokenShare =
          Number(position.balanceRaw) / Number(marketTokenTotalSupply)

        const longTokenShare = Number(longTokenPoolAmountRaw) * marketTokenShare
        const shortTokenShare =
          Number(shortTokenPoolAmountRaw) * marketTokenShare

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
                balanceRaw: BigInt(Math.round(longTokenShare)),
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
              balanceRaw: BigInt(Math.round(longTokenShare)),
              type: TokenType.Underlying,
            },
            {
              address: shortToken.address,
              name: shortToken.name,
              symbol: shortToken.symbol,
              decimals: shortToken.decimals,
              balanceRaw: BigInt(Math.round(shortTokenShare)),
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
    const { underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const reader = Reader__factory.connect(
      contractAddresses[this.chainId]!.reader,
      this.provider,
    )

    const {
      marketToken: marketTokenAddress,
      longToken: longTokenAddress,
      shortToken: shortTokenAddress,
    } = await reader.getMarket(
      contractAddresses[this.chainId]!.dataStore,
      protocolToken.address,
    )

    const marketToken = Erc20__factory.connect(
      marketTokenAddress,
      this.provider,
    )
    const longToken = Erc20__factory.connect(longTokenAddress, this.provider)
    const shortToken = Erc20__factory.connect(shortTokenAddress, this.provider)
    const dataStore = DataStore__factory.connect(
      contractAddresses[this.chainId]!.dataStore,
      this.provider,
    )

    const [
      marketTokenTotalSupply,
      longTokenDecimals,
      longTokenPoolAmountRaw,
      shortTokenDecimals,
      shortTokenPoolAmountRaw,
    ] = await Promise.all([
      marketToken.totalSupply(),
      longToken.decimals(),
      dataStore.getUint(
        this.hashPoolAmount(marketTokenAddress, longTokenAddress),
      ),
      shortToken.decimals(),
      dataStore.getUint(
        this.hashPoolAmount(marketTokenAddress, shortTokenAddress),
      ),
    ])

    return {
      ...protocolToken,
      type: TokenType.Protocol,
      baseRate: 1,
      tokens: underlyingTokens?.map((token, i) => {
        return {
          ...token,
          type: TokenType.Underlying,
          underlyingRateRaw:
            (10 ** protocolToken.decimals * i === 0
              ? longTokenPoolAmountRaw
              : shortTokenPoolAmountRaw) / marketTokenTotalSupply,
        }
      }),
    }
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
