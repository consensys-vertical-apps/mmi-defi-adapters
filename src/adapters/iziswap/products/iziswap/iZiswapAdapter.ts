import { formatUnits } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { ResolveUnderlyingPositions } from '../../../../core/decorators/resolveUnderlyingPositions'
import { NotImplementedError } from '../../../../core/errors/errors'
import { aggregateTrades } from '../../../../core/utils/aggregateTrades'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { formatProtocolTokenArrayToMap } from '../../../../core/utils/protocolTokenToMap'
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
  Underlying,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { LiquidityManager__factory } from '../../contracts/factories'

const nullAddress = "0x0000000000000000000000000000000000000000";
const contractAddresses: Partial<Record<Chain, { liquidityManager: string }>> = {
  [Chain.Arbitrum]: {
    liquidityManager: '0x01fDea353849cA29F778B2663BcaCA1D191bED0e',
  },
  [Chain.Linea]: {
    liquidityManager: '0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c',
  },
  [Chain.Bsc]: {
    liquidityManager: '0xBF55ef05412f1528DbD96ED9E7181f87d8C9F453',
  },
  [Chain.Base]: {
    liquidityManager: '0x110dE362cc436D7f54210f96b8C7652C2617887D',
  },
}

export class IZiswapAdapter implements IProtocolAdapter {
  productId = 'iziswap'
  protocolId: Protocol
  chainId: Chain

  adaptersController: AdaptersController

  private provider: CustomJsonRpcProvider

  constructor({ provider, chainId, protocolId, adaptersController }: ProtocolAdapterParams) {
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

  /**
   * Update me.
   * Returning an array of your protocol tokens.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  @ResolveUnderlyingPositions
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

        if (liquidity.liquidity == 0n) {
          return undefined
        }

        const poolMeta = await liquidityManagerContract.poolMetas(liquidity.poolId, {
          blockTag: blockNumber,
        })

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
            '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
            '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
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
      throw new Error('TokenId required for iZiswap withdrawals')
    }

    return await this.getMovements({
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
      throw new Error('TokenId required for iZiswap deposits')
    }
    return await this.getMovements({
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'deposit',
      tokenId,
    })
  }

  /**
   * Update me.
   * Add logic to get tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to calculate the underlying token rate of 1 protocol token
   */
  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  async getProfits({
    userAddress,
    fromBlock,
    toBlock,
  }: GetProfitsInput): Promise<ProfitsWithRange> {
    const [currentValues, previousValues] = await Promise.all([
      this.getPositions({
        userAddress,
        blockNumber: toBlock,
      }).then((result) => formatProtocolTokenArrayToMap(result, true)),
      this.getPositions({
        userAddress,
        blockNumber: fromBlock,
      }).then((result) => formatProtocolTokenArrayToMap(result, true)),
    ])

    const tokens = await Promise.all(
      Object.values(currentValues).map(
        async ({ protocolTokenMetadata, underlyingTokenPositions }) => {
          const getEventsInput: GetEventsInput = {
            userAddress,
            protocolTokenAddress: protocolTokenMetadata.address,
            fromBlock,
            toBlock,
            tokenId: protocolTokenMetadata.tokenId,
          }

          const [withdrawals, deposits] = await Promise.all([
            this.getWithdrawals(getEventsInput).then(aggregateTrades),
            this.getDeposits(getEventsInput).then(aggregateTrades),
          ])

          return {
            ...protocolTokenMetadata,
            type: TokenType.Protocol,
            tokens: Object.values(underlyingTokenPositions).map(
              ({
                address,
                name,
                symbol,
                decimals,
                balanceRaw: startPositionValueRaw,
              }) => {
                const endPositionValueRaw =
                  previousValues[protocolTokenMetadata.tokenId!]
                    ?.underlyingTokenPositions[address]?.balanceRaw ?? 0n

                const calculationData = {
                  withdrawalsRaw: withdrawals[address] ?? 0n,
                  depositsRaw: deposits[address] ?? 0n,
                  startPositionValueRaw: startPositionValueRaw ?? 0n,
                  endPositionValueRaw,
                }

                const profitRaw =
                  calculationData.startPositionValueRaw +
                  calculationData.withdrawalsRaw -
                  calculationData.depositsRaw -
                  calculationData.endPositionValueRaw

                return {
                  address,
                  name,
                  symbol,
                  decimals,
                  profitRaw,
                  type: TokenType.Underlying,
                  calculationData: {
                    withdrawalsRaw: withdrawals[address] ?? 0n,
                    withdrawals: formatUnits(
                      withdrawals[address] ?? 0n,
                      decimals,
                    ),
                    depositsRaw: deposits[address] ?? 0n,
                    deposits: formatUnits(deposits[address] ?? 0n, decimals),
                    startPositionValueRaw: startPositionValueRaw ?? 0n,
                    startPositionValue: formatUnits(
                      startPositionValueRaw ?? 0n,
                      decimals,
                    ),
                    endPositionValueRaw,
                    endPositionValue: formatUnits(
                      endPositionValueRaw ?? 0n,
                      decimals,
                    ),
                  },
                }
              },
            ),
          }
        },
      ),
    )

    return { tokens, fromBlock, toBlock }
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  private async getMovements({
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
            `iZiswap tokenId: ${tokenId} at blocknumber: ${fromBlock} does not exist, has position been minted yet or burned?`,
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
          underlyingTokensMovement: {
            [tokenX]: {
              movementValueRaw: amountX,
              ...tokenXMetadata,
              transactionHash,
            },
            [tokenY]: {
              movementValueRaw: amountY,
              ...tokenYMetadata,
              transactionHash,
            },
          },
          blockNumber,
        }
      }),
    )
  }
}
