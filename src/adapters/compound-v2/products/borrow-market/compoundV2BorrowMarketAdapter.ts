import { Erc20__factory } from '../../../../contracts'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { ResolveUnderlyingMovements, ResolveUnderlyingPositions } from '../../../../core/decorators/resolveUnderlyingPositions'
import { NotImplementedError } from '../../../../core/errors/errors'
import { filterMapAsync } from '../../../../core/utils/filters'
import {
  ProtocolDetails,
  PositionType,
  TokenBalance,
  UnderlyingTokenRate,
  Underlying,
  AssetType,
  TokenType,
  GetPositionsInput,
  ProtocolPosition,
  GetEventsInput,
  MovementsByBlock,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { CompoundV2MarketAdapter } from '../../common/compoundV2MarketAdapter'
import { Cerc20__factory, Comptroller__factory } from '../../contracts'

export class CompoundV2BorrowMarketAdapter extends CompoundV2MarketAdapter {
  productId = 'borrow-market'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'CompoundV2',
      description: 'CompoundV2 borrow market adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return await super.buildMetadata()
  }

  @ResolveUnderlyingPositions
  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const comptrollerContract = Comptroller__factory.connect(
      this.contractAddresses[this.chainId]!.comptrollerAddress,
      this.provider,
    )

    const pools = await comptrollerContract.getAssetsIn(userAddress)

    return await filterMapAsync(pools, async (poolContractAddress) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(poolContractAddress)
      ) {
        return undefined
      }

      const { protocolToken, underlyingToken } = await this.fetchPoolMetadata(
        poolContractAddress,
      )

      const poolContract = Cerc20__factory.connect(
        poolContractAddress,
        this.provider,
      )

      const borrowBalance = await poolContract.borrowBalanceCurrent.staticCall(
        userAddress,
        {
          blockTag: blockNumber,
        },
      )

      if (borrowBalance === 0n) {
        return undefined
      }

      return {
        ...protocolToken,
        balanceRaw: 1n,
        type: TokenType.Protocol,
        tokens: [
          {
            ...underlyingToken,
            balanceRaw: borrowBalance,
            type: TokenType.Underlying,
          },
        ],
      }
    })
  }

  @ResolveUnderlyingMovements
  async getBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    const underlyingContract = Erc20__factory.connect(
      underlyingToken.address,
      this.provider,
    )

    const filter = underlyingContract.filters.Transfer(
      protocolTokenAddress,
      userAddress,
      undefined,
    )
    const eventResults = await underlyingContract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value: underlyingTokenMovementValueRaw },
          transactionHash,
        } = transferEvent

        return {
          transactionHash,
          protocolToken: {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          },
          tokens: [
            {
              ...underlyingToken,
              balanceRaw: underlyingTokenMovementValueRaw,
              type: TokenType.Underlying,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )
  }

  // @ResolveUnderlyingMovements
  // async getRepays({
  //   userAddress,
  //   protocolTokenAddress,
  //   fromBlock,
  //   toBlock,
  // }: GetEventsInput): Promise<MovementsByBlock[]> {
  //   return await this.getProtocolTokenMovements({
  //     protocolToken: await this.fetchProtocolTokenMetadata(
  //       protocolTokenAddress,
  //     ),

  //     filter: {
  //       fromBlock,
  //       toBlock,
  //       from: userAddress,
  //       to: undefined,
  //     },
  //   })
  // }

  // Not needed as it's all handled within getPositions
  // TODO Find a more elegant solution that doesn't involve extending SimplePoolAdapter
  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }

  protected async getUnderlyingTokenConversionRate(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    throw new NotImplementedError()
  }
}
