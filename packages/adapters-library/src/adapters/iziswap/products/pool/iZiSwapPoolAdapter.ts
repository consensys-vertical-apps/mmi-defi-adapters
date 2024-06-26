import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
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
import { maxUint128 } from '../../../uniswap-v3/products/pool/uniswapV3PoolAdapter'
import { LiquidityManager__factory } from '../../contracts/factories'

const contractAddresses: Partial<Record<Chain, { liquidityManager: string }>> =
  {
    [Chain.Arbitrum]: {
      liquidityManager: getAddress(
        '0xAD1F11FBB288Cd13819cCB9397E59FAAB4Cdc16F',
      ),
    },
    [Chain.Linea]: {
      liquidityManager: getAddress(
        '0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c',
      ),
    },
    [Chain.Bsc]: {
      liquidityManager: getAddress(
        '0xBF55ef05412f1528DbD96ED9E7181f87d8C9F453',
      ),
    },
    [Chain.Base]: {
      liquidityManager: getAddress(
        '0x110dE362cc436D7f54210f96b8C7652C2617887D',
      ),
    },
  }

export class IZiSwapPoolAdapter implements IProtocolAdapter {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  adaptersController: AdaptersController

  provider: CustomJsonRpcProvider

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
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'IZiSwap',
      description: 'IZiSwap defi adapter',
      siteUrl: 'https://izumi.finance',
      iconUrl: 'https://izumi.finance/assets/sidebar/logo.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const liquidityManagerContract = LiquidityManager__factory.connect(
      contractAddresses[this.chainId]!.liquidityManager,
      this.provider,
    )

    const balanceOf = await liquidityManagerContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    return filterMapAsync(
      [...Array(Number(balanceOf)).keys()],
      async (index) => {
        const tokenId = await liquidityManagerContract.tokenOfOwnerByIndex(
          userAddress,
          index,
          {
            blockTag: blockNumber,
          },
        )

        const liquidity = await liquidityManagerContract.liquidities(tokenId, {
          blockTag: blockNumber,
        })

        if (liquidity.liquidity === 0n) {
          return undefined
        }

        const poolMeta = await liquidityManagerContract.poolMetas(
          liquidity.poolId,
          {
            blockTag: blockNumber,
          },
        )

        const [
          { amountX, amountY },
          { amountX: amountXFee, amountY: amountYFee },
          tokenXMetadata,
          tokenYMetadata,
        ] = await Promise.all([
          liquidityManagerContract.decLiquidity.staticCall(
            tokenId,
            liquidity.liquidity,
            0n,
            0n,
            '0xffffffff',
            { from: userAddress, blockTag: blockNumber },
          ),
          liquidityManagerContract.collect.staticCall(
            userAddress,
            tokenId,
            maxUint128,
            maxUint128,
            { from: userAddress, blockTag: blockNumber },
          ),
          getTokenMetadata(poolMeta.tokenX, this.chainId, this.provider),
          getTokenMetadata(poolMeta.tokenY, this.chainId, this.provider),
        ])

        const nftName = this.protocolTokenName(
          tokenXMetadata.symbol,
          tokenYMetadata.symbol,
          poolMeta.fee,
        )

        return {
          address: contractAddresses[this.chainId]!.liquidityManager,
          tokenId: tokenId.toString(),
          name: nftName,
          symbol: nftName,
          decimals: 18,
          balanceRaw: liquidity.liquidity,
          type: TokenType.Protocol,
          tokens: [
            this.createUnderlyingToken(
              poolMeta.tokenX,
              tokenXMetadata,
              amountX,
              TokenType.Underlying,
            ),
            this.createUnderlyingToken(
              poolMeta.tokenX,
              tokenXMetadata,
              amountXFee,
              TokenType.UnderlyingClaimable,
            ),
            this.createUnderlyingToken(
              poolMeta.tokenY,
              tokenYMetadata,
              amountY,
              TokenType.Underlying,
            ),
            this.createUnderlyingToken(
              poolMeta.tokenY,
              tokenYMetadata,
              amountYFee,
              TokenType.UnderlyingClaimable,
            ),
          ],
        }
      },
    )
  }

  private protocolTokenName(
    token0Symbol: string,
    token1Symbol: string,
    fee: bigint,
  ) {
    return `${token0Symbol} / ${token1Symbol} - ${fee}`
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

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required for iZiSwap withdrawals')
    }

    return await this.getIziswapMovements({
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
      throw new Error('TokenId required for iZiSwap deposits')
    }
    return await this.getIziswapMovements({
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'deposit',
      tokenId,
    })
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private async getIziswapMovements({
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
    const liquidityManagerContract = LiquidityManager__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const eventFilters = {
      deposit: liquidityManagerContract.filters.AddLiquidity(tokenId),
      withdrawals: liquidityManagerContract.filters.DecLiquidity(tokenId),
    }

    const liquidity = await liquidityManagerContract.liquidities(tokenId)

    const { tokenX, tokenY, fee } = await liquidityManagerContract
      .poolMetas(liquidity.poolId, { blockTag: toBlock }) // Encountered failures if nft not yet minted
      .catch((error) => {
        if (error?.message?.includes('Invalid token ID')) {
          throw new Error(
            `iZiSwap tokenId: ${tokenId} at blocknumber: ${fromBlock} does not exist, has position been minted yet or burned?`,
          )
        }

        throw new Error(error)
      })
    const [tokenXMetadata, tokenYMetadata] = await Promise.all([
      getTokenMetadata(tokenX, this.chainId, this.provider),
      getTokenMetadata(tokenY, this.chainId, this.provider),
    ])

    const eventResults = await liquidityManagerContract.queryFilter(
      eventFilters[eventType],
      fromBlock,
      toBlock,
    )

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { amountX, amountY },
          transactionHash,
        } = transferEvent

        return {
          transactionHash,
          protocolToken: {
            address: protocolTokenAddress,
            name: this.protocolTokenName(
              tokenXMetadata.symbol,
              tokenYMetadata.symbol,
              fee,
            ),
            symbol: this.protocolTokenName(
              tokenXMetadata.symbol,
              tokenYMetadata.symbol,
              fee,
            ),
            decimals: 18,
            tokenId,
          },
          tokens: [
            {
              type: TokenType.Underlying,
              balanceRaw: amountX,
              ...tokenXMetadata,
              transactionHash,
              blockNumber,
            },
            {
              type: TokenType.Underlying,
              balanceRaw: amountY,
              ...tokenYMetadata,
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
