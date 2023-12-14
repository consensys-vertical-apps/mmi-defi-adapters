import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  GetProfitsInput,
  GetApyInput,
  GetAprInput,
  GetConversionRateInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProfitsWithRange,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import COINGECKO_LIST from '../../common/coingecko-list.json'
import { ChainLink__factory, UniswapQuoter__factory } from '../../contracts'
import { COINGECKO_CHAIN_ID } from '../../common/coingecko-chain-id'

// manually taken from https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1
const chainlinUsdEthFeeds = {
  [Chain.Ethereum]: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  [Chain.Optimism]: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
  [Chain.Bsc]: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
  [Chain.Polygon]: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
  [Chain.Fantom]: '0x11DdD3d147E5b83D01cee7070027092397d63658',
  [Chain.Base]: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
  [Chain.Arbitrum]: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
  [Chain.Avalanche]: '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
  [Chain.Linea]: '0x3c6Cd9Cc7c7a4c2Cf5a82734CD249D7D593354dA',
}

export const USD_DECIMALS = 18

const WETH = {
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  name: 'Wrapped Ether',
  symbol: 'WETH',
  decimals: 18,
}

export const nativeTokenWappedTokenId: Record<Chain, string> = {
  [Chain.Ethereum]: 'weth',
  [Chain.Optimism]: 'optimism',
  [Chain.Bsc]: 'bsc',
  [Chain.Polygon]: 'polygon',
  [Chain.Fantom]: 'fantom',
  [Chain.Base]: 'base',
  [Chain.Arbitrum]: 'arbitrum',
  [Chain.Avalanche]: 'avalanche',
  [Chain.Linea]: 'linea',
}

type PriceMetadata = Record<
  string,
  Erc20Metadata & { addressOnMainnet: string }
>

const QUOTER_CONTRACT = '0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6'
export class PricesUSDAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'usd'
  protocolId: Protocol
  chainId: Chain

  private provider: CustomJsonRpcProvider

  private readonly chainLinkDecimals = 8

  // from coingecko data
  private wethAddresses: Record<string, string> = {
    ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    'binance-smart-chain': '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    'optimistic-ethereum': '0x4200000000000000000000000000000000000006',
    base: '0x4200000000000000000000000000000000000006',
    sora: '0x0200070000000000000000000000000000000000000000000000000000000000',
    thundercore: '0x6576bb918709906dcbfdceae4bb1e6df7c8a1077',
    conflux: '0xa47f43de2f9623acb395ca4905746496d2014d57',
    kardiachain: '0x1540020a94aa8bc189aa97639da213a4ca49d9a7',
    callisto: '0xcc208c32cc6919af5d8026dab7a3ec7a57cd1796',
    zksync: '0x5aea5775959fbc2557cc8789bc1bf90a239d9a91',
    'polygon-zkevm': '0x4f9a0e7fd2bf6067db6994cf12e4495df938e6e9',
    'near-protocol':
      'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.factory.bridge.near',
    velas: '0x6ab6d61428fde76768d7b45d8bfeec19c6ef91a8',
    'klay-token': '0xcd6f29dc9ca217d0973d3d21bf58edd3ca871a86',
    dogechain: '0xb44a9b6905af7c801311e8f4e76932ee959c663c',
    canto: '0x5fd55a1b9fc24967c4db09c513c3ba0dfa7ff687',
    'arbitrum-nova': '0x722e8bdd2ce80a4422e880164f2079488e115365',
    cube: '0x57eea49ec1087695274a9c4f341e414eb64328c2',
    kava: '0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d',
    'sx-network': '0xa173954cc4b1810c0dbdb007522adbc182dab380',
    astar: '0x81ecac0d6be0550a00ff064a4f9dd2400585fe9c',
    cosmos:
      'ibc/EA1D43981D5C9A1C4AAEA9C23BB1D4FA126BA9BC7020A25E0AE4AA841EA25DC5',
    energi: '0x78b050d981d7f6e019bf6e361d0d1167de6b19da',
    elastos: '0x802c3e839e4fdb10af583e3e759239ec7703501e',
    'milkomeda-cardano': '0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d',
    syscoin: '0x7c598c96d02398d89fbcb9d41eab3df0c16f227d',
    telos: '0xfa9343c3897324496a05fc75abed6bac29f8a40f',
    moonbeam: '0x30d2a9f5fdf90ace8c17952cbb4ee48a55d916a7',
    theta: '0x3674d64aab971ab974b2035667a4b3d09b5ec2b3',
    meter: '0x79a61d3a28f8c8537a3df63092927cfa1150fb3c',
    tomochain: '0x2eaa73bd0db20c64f53febea7b5f5e5bccc7fb8b',
    moonriver: '0x639a647fbe20b6c8ac19e48e2de44ea792c62c5c',
    'kucoin-community-chain': '0xf55af137a98607f7ed2efefa4cd2dfe70e4253b1',
    fuse: '0xa722c13135930332eb3d749b2f0906559d2c5b99',
    'metis-andromeda': '0x420000000000000000000000000000000000000a',
    aurora: '0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb',
    tron: 'THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF',
    cronos: '0xe44fd7fcb2b1581822d0c862b68222998a0c299a',
    boba: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000',
    ronin: '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5',
    celo: '0x2def4285787d58a2f811af24755a8150622f4361',
    'harmony-shard-0': '0x6983d1e6def3690c4d616b13597a09e6193ea013',
    'arbitrum-one': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    avalanche: '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
    fantom: '0x74b23882a30290451a17c44f4f05243b6b58c76d',
    'polygon-pos': '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    xdai: '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
  }

  private fromIdToCoingeckoId: Record<string, string>

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController

    this.fromIdToCoingeckoId = COINGECKO_CHAIN_ID.reduce(
      (acc, info) => {
        if (!info?.chain_identifier || !info.id) {
          return acc
        }
        return { [info.chain_identifier]: info.id, ...acc }
      },
      {} as Record<string, string>,
    )
  }
  adaptersController: AdaptersController

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Prices',
      description: 'Prices defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const metadata: PriceMetadata = {}

    if (this.chainId == Chain.Ethereum) {
      metadata[ZERO_ADDRESS.toLowerCase()] = {
        ...WETH,
        address: ZERO_ADDRESS.toLowerCase(),
        addressOnMainnet: WETH.address,
      }
      metadata['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()] = {
        ...WETH,
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        addressOnMainnet: WETH.address,
      }
    }

    const promises = COINGECKO_LIST?.map(async (token) => {
      if (!token.platforms) {
        return
      }

      const addressOnThisChain =
        token.platforms[this.fromIdToCoingeckoId[this.chainId] as string]

      const addressOnMainnet =
        token.platforms[this.fromIdToCoingeckoId[Chain.Ethereum]]

      if (!addressOnThisChain || !addressOnMainnet) {
        return
      }

      let tokenDetails
      try {
        tokenDetails = await getTokenMetadata(
          addressOnMainnet,
          Chain.Ethereum,
          this.provider,
        )
      } catch (error) {
        return
      }

      metadata[addressOnThisChain] = {
        ...tokenDetails,
        address: addressOnThisChain.toLowerCase(),
        addressOnMainnet,
      }
    })

    await Promise.all(promises)

    return metadata
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const result = Object.values(await this.buildMetadata()).map(
      ({ address, decimals, name, symbol }) => {
        return { address, decimals, name, symbol }
      },
    )

    return result
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }

  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async getProtocolTokenToUnderlyingTokenRate({
    blockNumber,
    protocolTokenAddress,
  }: GetConversionRateInput): Promise<ProtocolTokenUnderlyingRate> {
    const tokenDetails = await this.fetchPoolMetadata(protocolTokenAddress)

    const wethAddress =
      this.wethAddresses[
        this.fromIdToCoingeckoId[this.chainId as unknown as string] as string
      ]

    if (!wethAddress) {
      throw new Error('WETH address not found')
    }

    let erc20TokenPriceInEth
    if (wethAddress == protocolTokenAddress) {
      erc20TokenPriceInEth = BigInt(1 * 10 ** 18)
    } else {
      erc20TokenPriceInEth = await this.quoteExactInputSingleCall({
        tokenIn: tokenDetails.address,
        tokenOut: wethAddress,
        fee: 10000,
        amountOut: BigInt(1 * 10 ** tokenDetails.decimals),
        sqrtPriceLimitX96: 0,
        blockNumber,
      })

      // try to find pool with different fee
      if (!erc20TokenPriceInEth) {
        erc20TokenPriceInEth = await this.quoteExactInputSingleCall({
          tokenIn: tokenDetails.address,
          tokenOut: wethAddress,
          fee: 3000,
          amountOut: BigInt(1 * 10 ** tokenDetails.decimals),
          sqrtPriceLimitX96: 0,
          blockNumber,
        })
      }
    }

    if (!erc20TokenPriceInEth) {
      throw new NotImplementedError()
    }

    const contract = ChainLink__factory.connect(
      chainlinUsdEthFeeds[this.chainId],
      this.provider,
    )

    // decimals is 8
    const ethPriceUSD = await contract
      .latestRoundData({
        blockTag: blockNumber,
      })
      .catch((err) => {
        logger.error({ err }, 'Error calling USD oracle')
        return false
      })

    if (!ethPriceUSD) {
      throw new NotImplementedError()
    }

    const tokenPriceInUSD = this.calculateERC20PriceInUsd({
      erc20TokenPriceInEth: erc20TokenPriceInEth as bigint,
      //@ts-ignore
      ethPriceUSD: ethPriceUSD!.answer,
      ethDecimals: WETH.decimals,
      usdDecimals: tokenDetails.decimals,
    })

    return {
      name: tokenDetails.name,
      decimals: tokenDetails.decimals,
      symbol: tokenDetails.symbol,
      address: protocolTokenAddress,
      baseRate: 1,
      type: 'protocol',
      tokens: [
        {
          type: TokenType.Fiat,
          underlyingRateRaw: BigInt(tokenPriceInUSD.toString()),
          decimals: USD_DECIMALS,
          name: 'USD',
          symbol: 'USD',
          address: 'TheUnitedStatesMint',
        },
      ],
    }
  }

  private calculateERC20PriceInUsd({
    erc20TokenPriceInEth,
    ethPriceUSD,
    ethDecimals,
    usdDecimals,
  }: {
    erc20TokenPriceInEth: bigint
    ethPriceUSD: bigint
    ethDecimals: number
    usdDecimals: number
  }): bigint {
    // Convert the ERC20 token price and ETH price to a common base (using bigint for precision)
    const tokenPriceInEthBase =
      erc20TokenPriceInEth * BigInt(Math.pow(10, usdDecimals))
    const ethPriceInUsdBase = ethPriceUSD * BigInt(Math.pow(10, ethDecimals))

    // Calculate the token price in USD (in the common base)
    const tokenPriceInUsdBase =
      (tokenPriceInEthBase * ethPriceInUsdBase) /
      BigInt(Math.pow(10, ethDecimals + usdDecimals + this.chainLinkDecimals))

    return tokenPriceInUsdBase
  }

  /**
   * Update me.
   * Add logic to calculate the users profits
   */
  async getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  private async quoteExactInputSingleCall({
    fee,
    tokenIn,
    tokenOut,
    amountOut,
    sqrtPriceLimitX96,
    blockNumber,
  }: {
    fee: number
    tokenIn: string
    tokenOut: string
    amountOut: bigint
    sqrtPriceLimitX96: number
    blockNumber?: number
  }) {
    const uniswapQuoter = await UniswapQuoter__factory.connect(
      QUOTER_CONTRACT,
      this.provider,
    )

    try {
      return await uniswapQuoter.quoteExactInputSingle.staticCall(
        tokenIn,
        tokenOut,
        fee,
        amountOut,
        sqrtPriceLimitX96,
        { blockTag: blockNumber },
      )
    } catch (err) {
      logger.debug(
        { err, chainId: this.chainId, QUOTER_CONTRACT },
        'Error calling quoteExactInputSingle, pool might be missing in uniswap',
      )

      return false
    }
  }
}
