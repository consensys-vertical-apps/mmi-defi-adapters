import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { PositionManager__factory } from '../../contracts'

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

export const maxUint128 = 2n ** 128n - 1n

export class QuickswapV3PoolAdapter implements IProtocolAdapter {
  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
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

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'QuickswapV3',
      description: 'Quickswap v3 defi adapter',
      siteUrl: 'https://uniswap.org/',
      iconUrl: '',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getProtocolTokens(): Promise<ProtocolToken[]> {
    throw new NotImplementedError()
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
        getTokenMetadata(position.token0, this.chainId, this.provider),
        getTokenMetadata(position.token1, this.chainId, this.provider),
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

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required for uniswap withdrawals')
    }

    return await this.getUniswapMovements({
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'withdrawals',
      tokenId,
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required for uniswap deposits')
    }
    return await this.getUniswapMovements({
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'deposit',
      tokenId,
    })
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

  private async getUniswapMovements({
    protocolTokenAddress,
    eventType,
    fromBlock,
    toBlock,
    tokenId,
  }: {
    protocolTokenAddress: string
    eventType: 'withdrawals' | 'deposit'
    fromBlock: number
    toBlock: number
    tokenId: string
  }): Promise<MovementsByBlock[]> {
    const positionsManagerContract = PositionManager__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const eventFilters = {
      deposit: positionsManagerContract.filters.IncreaseLiquidity(tokenId),
      withdrawals: positionsManagerContract.filters.Collect(tokenId),
    }

    const { token0, token1 } = await positionsManagerContract
      .positions(tokenId, { blockTag: toBlock }) // Encountered failures if nft not yet minted
      .catch((error) => {
        if (error?.message?.includes('Invalid token ID')) {
          throw new Error(
            `Uniswap tokenId: ${tokenId} at blocknumber: ${fromBlock} does not exist, has position been minted yet or burned?`,
          )
        }

        throw new Error(error)
      })
    const [token0Metadata, token1Metadata] = await Promise.all([
      getTokenMetadata(token0, this.chainId, this.provider),
      getTokenMetadata(token1, this.chainId, this.provider),
    ])

    const eventResults = await positionsManagerContract.queryFilter(
      eventFilters[eventType],
      fromBlock,
      toBlock,
    )

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { amount0, amount1 },
          transactionHash,
        } = transferEvent

        return {
          transactionHash,
          protocolToken: {
            address: protocolTokenAddress,
            name: this.protocolTokenName(
              token0Metadata.symbol,
              token1Metadata.symbol,
            ),
            symbol: this.protocolTokenName(
              token0Metadata.symbol,
              token1Metadata.symbol,
            ),
            decimals: 18,
            tokenId,
          },
          tokens: [
            {
              type: TokenType.Underlying,
              balanceRaw: amount0,
              ...token0Metadata,
              transactionHash,
              blockNumber,
            },
            {
              type: TokenType.Underlying,
              balanceRaw: amount1,
              ...token1Metadata,
              transactionHash,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )
  }
}