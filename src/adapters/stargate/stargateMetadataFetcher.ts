import { Chain } from '../../core/constants/chains'
import { Json } from '../../types/json'
import { StargatePoolMetadata, StargateVestingMetadata } from './buildMetadata'
import ARBITRUM_POOL_METADATA from './products/pool/arbitrum/metadata.json'
import ETHEREUM_POOL_METADATA from './products/pool/ethereum/metadata.json'
import ARBITRUM_VESTING_METADATA from './products/vesting/arbitrum/metadata.json'
import ETHEREUM_VESTING_METADATA from './products/vesting/ethereum/metadata.json'

const PoolMetadata: Partial<Record<Chain, StargatePoolMetadata>> = {
  [Chain.Ethereum]: ETHEREUM_POOL_METADATA,
  [Chain.Arbitrum]: ARBITRUM_POOL_METADATA,
}

const VestingMetadata: Partial<Record<Chain, StargateVestingMetadata>> = {
  [Chain.Ethereum]: ETHEREUM_VESTING_METADATA,
  [Chain.Arbitrum]: ARBITRUM_VESTING_METADATA,
}

export function fetchStargatePoolMetadata(chainId: Chain) {
  return fetchMetadata(chainId, PoolMetadata)
}

export function fetchStargateVestingMetadata(chainId: Chain) {
  return fetchMetadata(chainId, VestingMetadata)
}

function fetchMetadata<AdapterMetadata extends Json>(
  chainId: Chain,
  chainMetadata: Partial<Record<Chain, AdapterMetadata>>,
) {
  const metadata = chainMetadata[chainId]
  if (!metadata) {
    throw new Error(`No metadata for AaveV2 on chain ${chainId}`)
  }

  return metadata
}
