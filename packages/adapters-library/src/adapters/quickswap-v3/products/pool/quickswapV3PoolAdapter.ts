import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { TrustWalletProtocolIconMap } from '../../../../core/utils/buildIconUrl'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { PositionManager__factory } from '../../contracts'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'

// A deadline value needs to be passed to the call, so a stub is generated here
const deadline = Math.floor(Date.now() - 1000) + 60 * 10

const positionManagerCommonAddress = getAddress(
  '0x8ef88e4c7cfbbac1c163f7eddd4b578792201de6',
)

const contractAddresses: Partial<Record<Chain, { positionManager: string }>> = {
  [Chain.Polygon]: {
    positionManager: positionManagerCommonAddress,
  },
}

const maxUint128 = 2n ** 128n - 1n

export class QuickswapV3PoolAdapter implements IProtocolAdapter {
  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: 'Transfer',
  }

  productId = 'pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adaptersController: AdaptersController

  provider: CustomJsonRpcProvider

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

  unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'QuickswapV3',
      description: 'Quickswap v3 defi adapter',
      siteUrl: 'https://quickswap.exchange/',
      iconUrl: TrustWalletProtocolIconMap[Protocol.QuickswapV3],
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    return [
      {
        address: contractAddresses[this.chainId]!.positionManager,
        name: 'QuickSwap V3 Positions NFT-V1',
        symbol: 'QS-V3-POS',
        decimals: 0,
        underlyingTokens: [],
      },
    ]
  }

  async getPositions({
    userAddress,
    blockNumber,
    tokenIds: tokenIdsRaw,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const positionsManagerContract = PositionManager__factory.connect(
      contractAddresses[this.chainId]!.positionManager,
      this.provider,
    )

    const tokenIds =
      tokenIdsRaw?.map((tokenId) => BigInt(tokenId)) ??
      (await this.getTokenIds(userAddress, blockNumber))

    return filterMapAsync(tokenIds, async (tokenId) => {
      const position = await positionsManagerContract.positions(tokenId, {
        blockTag: blockNumber,
      })

      if (position.liquidity === 0n) {
        return undefined
      }

      const [
        { amount0, amount1 },
        { amount0: amount0Fee, amount1: amount1Fee },
        token0Metadata,
        token1Metadata,
      ] = await Promise.all([
        positionsManagerContract.decreaseLiquidity.staticCall(
          {
            tokenId: tokenId,
            liquidity: position.liquidity,
            amount0Min: 0n,
            amount1Min: 0n,
            deadline,
          },
          { from: userAddress, blockTag: blockNumber },
        ),
        positionsManagerContract.collect.staticCall(
          {
            tokenId,
            recipient: userAddress,
            amount0Max: maxUint128,
            amount1Max: maxUint128,
          },
          { from: userAddress, blockTag: blockNumber },
        ),
        this.helpers.getTokenMetadata(position.token0),
        this.helpers.getTokenMetadata(position.token1),
      ])

      const nftName = this.protocolTokenName(
        token0Metadata.symbol,
        token1Metadata.symbol,
      )

      return {
        address: contractAddresses[this.chainId]!.positionManager,
        tokenId: tokenId.toString(),
        name: nftName,
        symbol: nftName,
        decimals: 18,
        balanceRaw: position.liquidity,
        type: TokenType.Protocol,
        tokens: [
          this.createUnderlyingToken(
            position.token0,
            token0Metadata,
            amount0,
            TokenType.Underlying,
          ),
          this.createUnderlyingToken(
            position.token0,
            token0Metadata,
            amount0Fee,
            TokenType.UnderlyingClaimable,
          ),
          this.createUnderlyingToken(
            position.token1,
            token1Metadata,
            amount1,
            TokenType.Underlying,
          ),
          this.createUnderlyingToken(
            position.token1,
            token1Metadata,
            amount1Fee,
            TokenType.UnderlyingClaimable,
          ),
        ],
      }
    })
  }

  private async getTokenIds(
    userAddress: string,
    blockNumber: number | undefined,
  ): Promise<bigint[]> {
    const positionsManagerContract = PositionManager__factory.connect(
      contractAddresses[this.chainId]!.positionManager,
      this.provider,
    )
    const balanceOf = await positionsManagerContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    return await Promise.all(
      [...Array(Number(balanceOf)).keys()].map(async (index) => {
        return positionsManagerContract.tokenOfOwnerByIndex(
          userAddress,
          index,
          {
            blockTag: blockNumber,
          },
        )
      }),
    )
  }

  private protocolTokenName(token0Symbol: string, token1Symbol: string) {
    return `${token0Symbol} / ${token1Symbol}`
  }

  private createUnderlyingToken(
    address: string,
    metadata: Erc20Metadata,
    balanceRaw: bigint,
    type: typeof TokenType.Underlying | typeof TokenType.UnderlyingClaimable,
  ): Underlying {
    return {
      address,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      balanceRaw,
      type,
    }
  }
}
