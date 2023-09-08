import { Chain } from '../../core/constants/chains'
import { Json } from '../../types/json'
import { StargatePoolMetadata, StargateVestingMetadata } from './buildMetadata'
import ARBITRUM_POOL_METADATA from './products/pool/arbitrum/metadata.json'
import ETHEREUM_POOL_METADATA from './products/pool/ethereum/metadata.json'
import ARBITRUM_VESTING_METADATA from './products/vesting/arbitrum/metadata.json'
import ETHEREUM_VESTING_METADATA from './products/vesting/ethereum/metadata.json'

type ChainMetadata<AdapterMetadata extends Json> = Partial<
  Record<Chain, AdapterMetadata>
>

function fetchMetadata<AdapterMetadata extends Json>(
  chainId: Chain,
  chainMetadata: ChainMetadata<AdapterMetadata>,
) {
  const metadata = chainMetadata[chainId]
  if (!metadata) {
    throw new Error(`No metadata for Stargate on chain ${chainId}`)
  }

  return metadata
}

export function fetchStargatePoolMetadata(chainId: Chain) {
  const chainMetadata: Partial<Record<Chain, StargatePoolMetadata>> = {
    [Chain.Ethereum]: ETHEREUM_POOL_METADATA,
    [Chain.Arbitrum]: ARBITRUM_POOL_METADATA,
  }

  return fetchMetadata(chainId, chainMetadata)
}

export function fetchStargateVestingMetadata(chainId: Chain) {
  const chainMetadata: Partial<Record<Chain, StargateVestingMetadata>> = {
    [Chain.Ethereum]: ETHEREUM_VESTING_METADATA,
    [Chain.Arbitrum]: ARBITRUM_VESTING_METADATA,
  }

  return fetchMetadata(chainId, chainMetadata)
}
