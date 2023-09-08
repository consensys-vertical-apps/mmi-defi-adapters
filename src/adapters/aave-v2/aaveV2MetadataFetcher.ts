import { Chain } from '../../core/constants/chains'
import { Json } from '../../types/json'
import { AaveV2PoolMetadata } from './buildMetadata'
import AVALANCHE_A_TOKEN_METADATA from './products/pool/avalanche/a-token-pool-metadata.json'
import AVALANCHE_STABLE_DEBT_TOKEN_METADATA from './products/pool/avalanche/stable-debt-token-pool-metadata.json'
import AVALANCHE_VARIABLE_DEBT_TOKEN_METADATA from './products/pool/avalanche/variable-debt-token-pool-metadata.json'
import ETHEREUM_A_TOKEN_METADATA from './products/pool/ethereum/a-token-pool-metadata.json'
import ETHEREUM_STABLE_DEBT_TOKEN_METADATA from './products/pool/ethereum/stable-debt-token-pool-metadata.json'
import ETHEREUM_VARIABLE_DEBT_TOKEN_METADATA from './products/pool/ethereum/variable-debt-token-pool-metadata.json'
import POLYGON_A_TOKEN_METADATA from './products/pool/polygon/a-token-pool-metadata.json'
import POLYGON_STABLE_DEBT_TOKEN_METADATA from './products/pool/polygon/stable-debt-token-pool-metadata.json'
import POLYGON_VARIABLE_DEBT_TOKEN_METADATA from './products/pool/polygon/variable-debt-token-pool-metadata.json'

const ATokenMetadata: Partial<Record<Chain, AaveV2PoolMetadata>> = {
  [Chain.Ethereum]: ETHEREUM_A_TOKEN_METADATA,
  [Chain.Polygon]: POLYGON_A_TOKEN_METADATA,
  [Chain.Avalanche]: AVALANCHE_A_TOKEN_METADATA,
}

const StableDebtMetadata: Partial<Record<Chain, AaveV2PoolMetadata>> = {
  [Chain.Ethereum]: ETHEREUM_STABLE_DEBT_TOKEN_METADATA,
  [Chain.Polygon]: POLYGON_STABLE_DEBT_TOKEN_METADATA,
  [Chain.Avalanche]: AVALANCHE_STABLE_DEBT_TOKEN_METADATA,
}

const VariableDebtMetadata: Partial<Record<Chain, AaveV2PoolMetadata>> = {
  [Chain.Ethereum]: ETHEREUM_VARIABLE_DEBT_TOKEN_METADATA,
  [Chain.Polygon]: POLYGON_VARIABLE_DEBT_TOKEN_METADATA,
  [Chain.Avalanche]: AVALANCHE_VARIABLE_DEBT_TOKEN_METADATA,
}

export function fetchAaveV2ATokenMetadata(chainId: Chain) {
  return fetchMetadata(chainId, ATokenMetadata)
}

export function fetchAaveV2StableDebtTokenMetadata(chainId: Chain) {
  return fetchMetadata(chainId, StableDebtMetadata)
}

export function fetchAaveV2VariableDebtTokenMetadata(chainId: Chain) {
  return fetchMetadata(chainId, VariableDebtMetadata)
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
