import {
  ApiV3PoolInfoConcentratedItem,
  CLMM_PROGRAM_ID,
  PositionInfoLayout,
  PositionUtils,
  Raydium,
  TickArrayLayout,
  TickUtils,
  U64_IGNORE_RANGE,
  getPdaPersonalPositionAddress,
} from '@raydium-io/raydium-sdk-v2'
import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'

import { SolanaHelpers } from '../../../../scripts/helpers'
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
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  SolanaProtocolAdapterParams,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'

import { Protocol } from '../../../protocols'

export class RaydiumConcentratedLiquidityAdapter implements IProtocolAdapter {
  productId = 'concentrated-liquidity'
  protocolId: Protocol
  chainId = Chain.Solana
  helpers: SolanaHelpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
  }

  private provider: Connection

  adaptersController: AdaptersController

  constructor({
    provider,
    protocolId,
    adaptersController,
    helpers,
  }: SolanaProtocolAdapterParams) {
    this.provider = provider

    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Raydium',
      description: 'Raydium defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    throw new NotImplementedError()
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    await this.getPosition(
      '3fPEQGSTnhw9Prw3kfqSsFgFyDpANPYL4aBAZxwT7JgM',
      input.userAddress,
    )

    return [
      await this.getPosition(
        '3fPEQGSTnhw9Prw3kfqSsFgFyDpANPYL4aBAZxwT7JgM',
        input.userAddress,
      ),
    ]
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  private async getPosition(
    positionNftMint: string,
    owner: string,
  ): Promise<ProtocolPosition> {
    const raydium = await Raydium.load({
      owner: new PublicKey(owner),
      connection: this.provider,
      cluster: 'mainnet',
      disableFeatureCheck: true,
      disableLoadToken: true,
      blockhashCommitment: 'finalized',
    })

    const positionPubKey = getPdaPersonalPositionAddress(
      CLMM_PROGRAM_ID,
      new PublicKey(positionNftMint),
    ).publicKey

    const pos = await raydium.connection.getAccountInfo(positionPubKey)

    const position = PositionInfoLayout.decode(pos!.data)

    let poolInfo: ApiV3PoolInfoConcentratedItem

    try {
      poolInfo = (
        await raydium.api.fetchPoolById({ ids: position.poolId.toBase58() })
      )[0] as ApiV3PoolInfoConcentratedItem
    } catch (error) {
      const data = await raydium.clmm.getPoolInfoFromRpc(
        position.poolId.toBase58(),
      )
      poolInfo = data.poolInfo
    }

    const epochInfo = await raydium.connection.getEpochInfo()

    const { amountA, amountB } = PositionUtils.getAmountsFromLiquidity({
      poolInfo,
      ownerPosition: position,
      liquidity: position.liquidity,
      slippage: 0,
      add: false,
      epochInfo,
    })

    const token0: Underlying = {
      name: poolInfo.mintA.symbol,
      balanceRaw: BigInt(amountA.amount.toNumber()),
      address: poolInfo.mintA.address,
      decimals: poolInfo.mintA.decimals,
      symbol: poolInfo.mintA.symbol,
      type: TokenType.Underlying,
    }

    const token1: Underlying = {
      name: poolInfo.mintB.symbol,
      balanceRaw: BigInt(amountB.amount.toNumber()),
      address: poolInfo.mintB.address,
      decimals: poolInfo.mintB.decimals,
      symbol: poolInfo.mintB.symbol,
      type: TokenType.Underlying,
    }

    const underlying: Underlying[] = [token0, token1]

    const [tickLowerArrayAddress, tickUpperArrayAddress] = [
      TickUtils.getTickArrayAddressByTick(
        new PublicKey(poolInfo.programId),
        new PublicKey(poolInfo.id),
        position.tickLower,
        poolInfo.config.tickSpacing,
      ),
      TickUtils.getTickArrayAddressByTick(
        new PublicKey(poolInfo.programId),
        new PublicKey(poolInfo.id),
        position.tickUpper,
        poolInfo.config.tickSpacing,
      ),
    ]

    const tickArrayRes = await raydium.connection.getMultipleAccountsInfo([
      tickLowerArrayAddress,
      tickUpperArrayAddress,
    ])
    if (!tickArrayRes[0] || !tickArrayRes[1])
      throw new Error('tick data not found')

    const tickArrayLower = TickArrayLayout.decode(tickArrayRes[0].data)
    const tickArrayUpper = TickArrayLayout.decode(tickArrayRes[1].data)
    const tickLowerState =
      tickArrayLower.ticks[
        TickUtils.getTickOffsetInArray(
          position.tickLower,
          poolInfo.config.tickSpacing,
        )
      ]!
    const tickUpperState =
      tickArrayUpper.ticks[
        TickUtils.getTickOffsetInArray(
          position.tickUpper,
          poolInfo.config.tickSpacing,
        )
      ]!
    const rpcPoolData = await raydium.clmm.getRpcClmmPoolInfo({
      poolId: position.poolId,
    })
    const tokenFees = PositionUtils.GetPositionFeesV2(
      rpcPoolData,
      position,
      tickLowerState,
      tickUpperState,
    )
    const rewards = PositionUtils.GetPositionRewardsV2(
      rpcPoolData,
      position,
      tickLowerState,
      tickUpperState,
    )

    if (
      tokenFees.tokenFeeAmountA.gte(new BN(0)) &&
      tokenFees.tokenFeeAmountA.lt(U64_IGNORE_RANGE)
    ) {
      const feeA: Underlying = {
        name: poolInfo.mintA.symbol,
        balanceRaw: BigInt(tokenFees.tokenFeeAmountA.toNumber()),
        address: poolInfo.mintA.address,
        decimals: poolInfo.mintA.decimals,
        symbol: poolInfo.mintA.symbol,
        type: TokenType.UnderlyingClaimable,
      }

      underlying.push(feeA)
    }

    if (
      tokenFees.tokenFeeAmountB.gte(new BN(0)) &&
      tokenFees.tokenFeeAmountB.lt(U64_IGNORE_RANGE)
    ) {
      const feeB: Underlying = {
        name: poolInfo.mintB.symbol,
        balanceRaw: BigInt(tokenFees.tokenFeeAmountB.toNumber()),
        address: poolInfo.mintB.address,
        decimals: poolInfo.mintB.decimals,
        symbol: poolInfo.mintB.symbol,
        type: TokenType.UnderlyingClaimable,
      }

      underlying.push(feeB)
    }

    const rewardInfos = rewards.map((r) =>
      r.gte(new BN(0)) && r.lt(U64_IGNORE_RANGE) ? r : new BN(0),
    )

    rewardInfos.map((r, idx) => {
      const rewardMint = poolInfo.rewardDefaultInfos.find(
        (r) =>
          r.mint.address === rpcPoolData.rewardInfos[idx]!.tokenMint.toBase58(),
      )?.mint

      if (!rewardMint) return undefined

      underlying.push({
        name: rewardMint.symbol,
        balanceRaw: BigInt(r.toNumber()),
        address: rewardMint.address,
        decimals: rewardMint.decimals,
        symbol: rewardMint.symbol,
        type: TokenType.UnderlyingClaimable,
      })
    })

    return {
      name: `${poolInfo.mintA.symbol} - ${poolInfo.mintB.symbol}`,
      symbol: `${poolInfo.mintA.symbol}-${poolInfo.mintB.symbol}`,
      address: '',
      type: TokenType.Protocol,
      balanceRaw: BigInt(1),
      decimals: 0,
      tokens: underlying,
    }
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
