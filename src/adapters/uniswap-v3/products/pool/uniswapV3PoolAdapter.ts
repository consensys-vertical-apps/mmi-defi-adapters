import { ethers, formatUnits } from 'ethers'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { aggregateTrades } from '../../../../core/utils/aggregateTrades'
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
  GetClaimableRewardsInput,
  GetConversionRateInput,
  ProtocolRewardPosition,
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
import { PositionManager__factory } from '../../contracts'

// Parameter needed for static call request
// Set the date in the future to ensure the static call request doesn't trigger smart contract validation
const deadline = Math.floor(Date.now() - 1000) + 60 * 10

// Uniswap has different pools per fee e.g. 1%, 0.5%
const FEE_DECIMALS = 4

const positionManagerCommonAddress =
  '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'

const contractAddresses: Partial<Record<Chain, { positionManager: string }>> = {
  [Chain.Ethereum]: {
    positionManager: positionManagerCommonAddress,
  },
  [Chain.Arbitrum]: {
    positionManager: positionManagerCommonAddress,
  },
  [Chain.Optimism]: {
    positionManager: positionManagerCommonAddress,
  },
  [Chain.Polygon]: {
    positionManager: positionManagerCommonAddress,
  },
  [Chain.Bsc]: {
    positionManager: '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613',
  },
  [Chain.Base]: {
    positionManager: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  },
}

const maxUint128 = BigInt(2) ** BigInt(128) - BigInt(1)

export class UniswapV3PoolAdapter implements IProtocolAdapter {
  product = 'pool'
  protocolId: Protocol
  chainId: Chain

  private provider: ethers.JsonRpcProvider

  constructor({ provider, chainId, protocolId }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'UniswapV3',
      description: 'UniswapV3 defi adapter',
      siteUrl: 'https://uniswap.org/',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      product: this.product,
    }
  }

  /**
   * Update me.
   * Add logic to build protocol token metadata
   * For context see dashboard example ./dashboard.png
   * We need protocol token names, decimals, and also linked underlying tokens
   */
  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    throw new Error('Implement me d')

    return {}
  }

  /**
   * Update me.
   * Returning an array of your protocol tokens.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new Error('Implement me')
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const positionsManagerContract = PositionManager__factory.connect(
      contractAddresses[this.chainId]!.positionManager,
      this.provider,
    )

    const balanceOf = await positionsManagerContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    return filterMapAsync(
      [...Array(Number(balanceOf)).keys()],
      async (index) => {
        const tokenId = await positionsManagerContract.tokenOfOwnerByIndex(
          userAddress,
          index,
          {
            blockTag: blockNumber,
          },
        )

        const position = await positionsManagerContract.positions(tokenId, {
          blockTag: blockNumber,
        })

        if (position.liquidity == 0n) {
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
          getTokenMetadata(position.token0, this.chainId),
          getTokenMetadata(position.token1, this.chainId),
        ])

        const nftName = this.protocolTokenName(
          token0Metadata.symbol,
          token1Metadata.symbol,
          position.fee,
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
              TokenType.UnderlyingClaimableFee,
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
              TokenType.UnderlyingClaimableFee,
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
    return `${token0Symbol} / ${token1Symbol} - ${formatUnits(
      fee,
      FEE_DECIMALS,
    )}%`
  }

  /**
   * Update me.
   * Add logic to get userAddress claimable rewards per position
   */
  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new Error('Implement me')
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
      throw new Error('TokenId required for uniswap deposits')
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
   * Add logic to get user's claimed rewards per position by block range
   */
  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new Error('Implement me')
  }

  /**
   * Update me.
   * Add logic to get tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new Error('Implement me')
  }

  /**
   * Update me.
   * Add logic to calculate the underlying token rate of 1 protocol token
   */
  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new Error('Implement me')
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
    throw new Error('Implement me')
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new Error('Implement me')
  }
  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new Error('Implement me')
  }

  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new Error('Implement me')
  }

  private createUnderlyingToken(
    address: string,
    metadata: Erc20Metadata,
    balanceRaw: bigint,
    type: typeof TokenType.Underlying | typeof TokenType.UnderlyingClaimableFee,
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
    const positionsManagerContract = PositionManager__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const eventFilters = {
      deposit: positionsManagerContract.filters.IncreaseLiquidity(tokenId),
      withdrawals: positionsManagerContract.filters.Collect(tokenId),
    }

    const { token0, token1, fee } = await positionsManagerContract
      .positions(tokenId, { blockTag: fromBlock })
      .catch((error) => {
        if (error.message.includes('Invalid token ID')) {
          throw new Error(
            `Uniswap tokenId: ${tokenId} at blocknumber: ${fromBlock} does not exist, has position been minted yet or burned?`,
          )
        }

        throw new Error(error)
      })
    const [token0Metadata, token1Metadata] = await Promise.all([
      getTokenMetadata(token0, this.chainId),
      getTokenMetadata(token1, this.chainId),
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
        } = transferEvent

        return {
          protocolToken: {
            address: protocolTokenAddress,
            name: this.protocolTokenName(
              token0Metadata.symbol,
              token1Metadata.symbol,
              fee,
            ),
            symbol: this.protocolTokenName(
              token0Metadata.symbol,
              token1Metadata.symbol,
              fee,
            ),
            decimals: 18,
            tokenId,
          },
          underlyingTokensMovement: {
            [token0]: { movementValueRaw: amount0, ...token0Metadata },
            [token1]: { movementValueRaw: amount1, ...token1Metadata },
          },
          blockNumber,
        }
      }),
    )
  }
}
