import { SqrtPriceMath } from '@uniswap/v3-sdk'
import Decimal from 'decimal.js'
import { ethers } from 'ethers'
import JSBI from 'jsbi'
import { Helpers } from '../../../../core/helpers'
import { PositionManager, StateView } from '../../contracts'

// https://gist.github.com/ahmedali8/3145761bda88d8dad4ca1f01e8b9f989
// Helper functions from the gist
const JSBI_ZERO = JSBI.BigInt(0)

function getSqrtPriceAtTick(tick: string): string {
  return new Decimal(1.0001)
    .pow(tick)
    .sqrt()
    .mul(new Decimal(2).pow(96))
    .toFixed(0)
}

function getAmount0Delta(
  sqrtPriceAX96: JSBI,
  sqrtPriceBX96: JSBI,
  liquidity: JSBI,
): JSBI {
  if (JSBI.lessThan(liquidity, JSBI_ZERO)) {
    return SqrtPriceMath.getAmount0Delta(
      sqrtPriceAX96,
      sqrtPriceBX96,
      JSBI.unaryMinus(liquidity),
      false,
    )
  }
  return JSBI.unaryMinus(
    SqrtPriceMath.getAmount0Delta(
      sqrtPriceAX96,
      sqrtPriceBX96,
      liquidity,
      true,
    ),
  )
}

function getAmount1Delta(
  sqrtPriceAX96: JSBI,
  sqrtPriceBX96: JSBI,
  liquidity: JSBI,
): JSBI {
  if (JSBI.lessThan(liquidity, JSBI_ZERO)) {
    return SqrtPriceMath.getAmount1Delta(
      sqrtPriceAX96,
      sqrtPriceBX96,
      JSBI.unaryMinus(liquidity),
      false,
    )
  }
  return JSBI.unaryMinus(
    SqrtPriceMath.getAmount1Delta(
      sqrtPriceAX96,
      sqrtPriceBX96,
      liquidity,
      true,
    ),
  )
}

// Function to construct poolId from position data
function getPoolId(
  currency0: string,
  currency1: string,
  fee: number,
  tickSpacing: number,
  hook: string,
) {
  // Sort tokens (token0 < token1)
  const [token0, token1] =
    currency0 < currency1 ? [currency0, currency1] : [currency1, currency0]
  // Construct poolId using keccak256 hash
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint24', 'int24', 'address'],
      [token0, token1, fee, tickSpacing, hook],
    ),
  )

  return poolId
}

// Function to fetch position data from PositionManager
async function fetchPositionData(
  tokenId: number,
  positionManagerContract: PositionManager,
  blockTag?: number,
) {
  // Execute all async calls in parallel
  const [poolAndPositionInfo, positionLiquidity] = await Promise.all([
    positionManagerContract.getPoolAndPositionInfo(tokenId, { blockTag }),
    positionManagerContract.getPositionLiquidity(tokenId, { blockTag }),
  ])

  if (!poolAndPositionInfo || !positionLiquidity) {
    return null
  }

  // The method returns [poolKey, positionInfo] where poolKey is a struct and positionInfo is uint256
  const [poolKey, info] = poolAndPositionInfo

  // Extract data from poolKey struct
  const currency0 = poolKey.currency0
  const currency1 = poolKey.currency1
  const fee = Number(poolKey.fee)
  const tickSpacing = Number(poolKey.tickSpacing)
  const hooks = poolKey.hooks

  // Construct poolId using the getPoolId function
  const poolId = getPoolId(currency0, currency1, fee, tickSpacing, hooks)

  interface PackedPositionInfo {
    getTickUpper(): number
    getTickLower(): number
    hasSubscriber(): boolean
  }

  function decodePositionInfo(value: bigint): PackedPositionInfo {
    return {
      getTickUpper: () => {
        const raw = Number((value >> 32n) & 0xffffffn)
        return raw >= 0x800000 ? raw - 0x1000000 : raw
      },

      getTickLower: () => {
        const raw = Number((value >> 8n) & 0xffffffn)
        return raw >= 0x800000 ? raw - 0x1000000 : raw
      },

      hasSubscriber: () => (value & 0xffn) !== 0n,
    }
  }

  const positionInfo = decodePositionInfo(BigInt(info.toString()))

  return {
    poolId: poolId,
    currency0: currency0,
    currency1: currency1,
    fee: fee,
    tickSpacing: tickSpacing,
    hook: hooks,
    tickLower: positionInfo.getTickLower(),
    tickUpper: positionInfo.getTickUpper(),
    liquidity: positionLiquidity.toString(),
  }
}

// Function to fetch live on-chain data including fee growth
async function fetchLivePoolData(
  poolId: string,
  tickLower: number,
  tickUpper: number,
  stateViewContract: StateView,
  blockTag?: number,
) {
  // Fetch current pool state
  const slot0 = await stateViewContract.getSlot0(poolId, { blockTag })

  // Fetch fee growth data for the position's tick range
  const [feeGrowthInside0X128, feeGrowthInside1X128] =
    await stateViewContract.getFeeGrowthInside(poolId, tickLower, tickUpper, {
      blockTag,
    })

  return {
    sqrtPriceX96: slot0.sqrtPriceX96.toString(),
    tick: slot0.tick,
    protocolFee: slot0.protocolFee,
    lpFee: slot0.lpFee,
    feeGrowthInside0X128: feeGrowthInside0X128.toString(),
    feeGrowthInside1X128: feeGrowthInside1X128.toString(),
  }
}

// Function to calculate token amounts for any position with live data
export async function getPosition(
  tokenId: number,
  positionManagerContract: PositionManager,
  stateViewContract: StateView,
  helper: Helpers,
  blockNumber?: number | undefined,
) {
  const positionData = await fetchPositionData(
    tokenId,
    positionManagerContract,
    blockNumber,
  )

  if (!positionData) {
    return null
  }

  // Execute all remaining async calls in parallel
  const [token0Metadata, token1Metadata, liveData] = await Promise.all([
    helper.getTokenMetadata(positionData.currency0),
    helper.getTokenMetadata(positionData.currency1),
    fetchLivePoolData(
      positionData.poolId,
      positionData.tickLower,
      positionData.tickUpper,
      stateViewContract,
      blockNumber,
    ),
  ])

  // Use actual position data
  const positionLiquidity = JSBI.BigInt(positionData.liquidity)
  const tickLower = positionData.tickLower
  const tickUpper = positionData.tickUpper

  // Use live data
  const currentTick = Number(liveData.tick)
  const sqrtPriceX96 = JSBI.BigInt(liveData.sqrtPriceX96)

  // Calculate sqrt prices at tick bounds
  const priceLower = JSBI.BigInt(getSqrtPriceAtTick(tickLower.toString()))
  const priceUpper = JSBI.BigInt(getSqrtPriceAtTick(tickUpper.toString()))

  let amount0: JSBI
  let amount1: JSBI

  if (JSBI.LT(JSBI.BigInt(currentTick), JSBI.BigInt(tickLower))) {
    // Position is entirely in token0 (WBTC)
    amount0 = getAmount0Delta(priceLower, priceUpper, positionLiquidity)
    amount1 = JSBI_ZERO
  } else if (JSBI.LT(JSBI.BigInt(currentTick), JSBI.BigInt(tickUpper))) {
    // Position is in range - has both tokens
    amount0 = getAmount0Delta(sqrtPriceX96, priceUpper, positionLiquidity)
    amount1 = getAmount1Delta(priceLower, sqrtPriceX96, positionLiquidity)
  } else {
    // Position is entirely in token1 (wstETH)
    amount0 = JSBI_ZERO
    amount1 = getAmount1Delta(priceLower, priceUpper, positionLiquidity)
  }

  // Get absolute values for minimum amounts
  const amount0Abs = JSBI.lessThan(amount0, JSBI_ZERO)
    ? JSBI.unaryMinus(amount0)
    : amount0
  const amount1Abs = JSBI.lessThan(amount1, JSBI_ZERO)
    ? JSBI.unaryMinus(amount1)
    : amount1

  return {
    token0: {
      rawBalance: amount0Abs.toString(),
      name: token0Metadata.name,
      symbol: token0Metadata.symbol,
      decimals: token0Metadata.decimals,
      address: positionData.currency0,
    },
    token1: {
      rawBalance: amount1Abs.toString(),
      name: token1Metadata.name,
      symbol: token1Metadata.symbol,
      decimals: token1Metadata.decimals,
      address: positionData.currency1,
    },
    position: {
      currentTick: currentTick,
      sqrtPriceX96: sqrtPriceX96.toString(),
      liquidity: positionData.liquidity,
      tickLower: positionData.tickLower,
      tickUpper: positionData.tickUpper,
      poolId: positionData.poolId,
    },
  }
}
