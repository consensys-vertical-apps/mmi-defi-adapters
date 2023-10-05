import { ethers, formatUnits } from 'ethers'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { filterMap } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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

const deadline = Math.floor(Date.now() - 1000) + 60 * 10

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

export class UniswapV3PoolAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
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
    throw new Error('Implement me')

    return {}
  }

  /**
   * Update me.
   * Returning an array of your protocol tokens.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new Error('Implement me')
  }

  /**
   * Update me.
   * Add logic to get userAddress positions in your protocol
   */
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

    const tokenIds = await Promise.all(
      [...Array(Number(balanceOf)).keys()].map((index) =>
        positionsManagerContract.tokenOfOwnerByIndex(userAddress, index, {
          blockTag: blockNumber,
        }),
      ),
    )

    const positionMetadata = await Promise.all(
      tokenIds.map((tokenId) =>
        positionsManagerContract.positions(tokenId, { blockTag: blockNumber }),
      ),
    )

    const nonZeroPositions = filterMap(positionMetadata, (position, index) => {
      if (position.liquidity == 0n) return undefined

      return {
        liquidity: position.liquidity,
        token0: position.token0,
        token1: position.token1,
        fee: position.fee,
        tokenId: tokenIds[index],
      }
    })

    if (nonZeroPositions.length == 0) return []

    const tokenBalancesPromises = nonZeroPositions.map(
      ({ liquidity, tokenId }) =>
        positionsManagerContract.decreaseLiquidity.staticCall(
          {
            tokenId: tokenId as bigint,
            liquidity,
            amount0Min: 0n,
            amount1Min: 0n,
            deadline,
          },
          { from: userAddress, blockTag: blockNumber },
        ),
    )

    const claimableFeesPromises = nonZeroPositions.map(
      ({ tokenId }) =>
        positionsManagerContract.collect.staticCall(
          {
            tokenId: tokenId as bigint,
            recipient: userAddress,
            amount0Max: maxUint128,
            amount1Max: maxUint128,
          },
          { from: userAddress, blockTag: blockNumber },
        ) ,
    )

    const erc20MetadataPromises = nonZeroPositions.map(({ token0, token1 }) =>
      Promise.all([
        getTokenMetadata(token0, this.chainId),
        getTokenMetadata(token1, this.chainId),
      ]),
    )

    const [tokenBalances, claimableFees, erc20Metadata] = await Promise.all([
      Promise.all(tokenBalancesPromises),
      Promise.all(claimableFeesPromises),
      Promise.all(erc20MetadataPromises),
    ])

    return nonZeroPositions.map((pos, index) => {

      const tokenBalance = tokenBalances[index]
      const claimableFee = claimableFees[index]
      const token0Metadata = erc20Metadata[index]![0]
      const token1Metadata = erc20Metadata[index]![1]
      if(!tokenBalance || !claimableFee || !token0Metadata || !token1Metadata){
        throw new Error('Error occurred while getting Uniswap positions')
      }

      const token0RawBalance = tokenBalance.amount0

      const token1RawBalance = tokenBalance.amount1

      const token0FeeRawBalance = claimableFee.amount0

      const token1FeeRawBalance = claimableFee.amount1


      const FEE_DECIMALS = 4
      const nftName = `${token0Metadata.symbol} / ${
        token1Metadata.symbol
      } - ${formatUnits(pos.fee, FEE_DECIMALS)}%`
      return {
        address: positionManagerCommonAddress,
        name: nftName,
        symbol: nftName,
        decimals: 18,
        balanceRaw: pos.liquidity,
        type: TokenType.Protocol,
        tokens: [
          this.createUnderlyingToken(
            pos.token0,
            token0Metadata,
            token0RawBalance,
            TokenType.Underlying,
          ),
          this.createUnderlyingToken(
            pos.token0,
            token0Metadata,
            token0FeeRawBalance,
            TokenType.UnderlyingClaimableFee,
          ),
          this.createUnderlyingToken(
            pos.token1,
            token1Metadata,
            token1RawBalance,
            TokenType.Underlying,
          ),
          this.createUnderlyingToken(
            pos.token1,
            token1Metadata,
            token1FeeRawBalance,
            TokenType.UnderlyingClaimableFee,
          ),
        ],
      }
    })
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

  /**
   * Update me.
   * Add logic to get user's withdrawals per position by block range
   */
  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new Error('Implement me')
  }

  /**
   * Update me.
   * Add logic to get user's deposits per position by block range
   */
  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new Error('Implement me')
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

  /**
   * Update me.
   * Add logic to calculate the users profits
   */
  async getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
    throw new Error('Implement me')
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
}
