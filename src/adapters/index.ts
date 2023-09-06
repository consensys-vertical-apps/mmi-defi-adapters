import { ethers } from 'ethers'
import { Chain } from '../core/constants/chains'
import { IProtocolAdapter } from '../types/adapter'
import { AaveV2ATokenPoolAdapter } from './aave-v2/products/pool/aaveV2ATokenPoolAdapter'
import { AaveV2StableDebtTokenPoolAdapter } from './aave-v2/products/pool/aaveV2StableDebtTokenPoolAdapter'
import { AaveV2VariableDebtTokenPoolAdapter } from './aave-v2/products/pool/aaveV2VariableDebtTokenPoolAdapter'
import AAVE_V2_AVALANCHE_A_TOKEN_POOL_METADATA from './aave-v2/products/pool/avalanche/a-token-pool-metadata.json'
import AAVE_V2_AVALANCHE_STABLE_DEBT_TOKEN_POOL_METADATA from './aave-v2/products/pool/avalanche/stable-debt-token-pool-metadata.json'
import AAVE_V2_AVALANCHE_VARIABLE_DEBT_TOKEN_POOL_METADATA from './aave-v2/products/pool/avalanche/variable-debt-token-pool-metadata.json'
import AAVE_V2_ETHEREUM_A_TOKEN_POOL_METADATA from './aave-v2/products/pool/ethereum/a-token-pool-metadata.json'
import AAVE_V2_ETHEREUM_STABLE_DEBT_TOKEN_POOL_METADATA from './aave-v2/products/pool/ethereum/stable-debt-token-pool-metadata.json'
import AAVE_V2_ETHEREUM_VARIABLE_DEBT_TOKEN_POOL_METADATA from './aave-v2/products/pool/ethereum/variable-debt-token-pool-metadata.json'
import AAVE_V2_POLYGON_A_TOKEN_POOL_METADATA from './aave-v2/products/pool/polygon/a-token-pool-metadata.json'
import AAVE_V2_POLYGON_STABLE_DEBT_TOKEN_POOL_METADATA from './aave-v2/products/pool/polygon/stable-debt-token-pool-metadata.json'
import AAVE_V2_POLYGON_VARIABLE_DEBT_TOKEN_POOL_METADATA from './aave-v2/products/pool/polygon/variable-debt-token-pool-metadata.json'
import { ExampleProductAdapter } from './example/products/example-product/exampleProductAdapter'
import ARBITRUM_POOL_METADATA from './stargate/products/pool/arbitrum/metadata.json'
import ETHEREUM_POOL_METADATA from './stargate/products/pool/ethereum/metadata.json'
import { StargatePoolAdapter } from './stargate/products/pool/stargatePoolAdapter'
import ETHEREUM_VESTING_METADATA from './stargate/products/vesting/ethereum/metadata.json'
import { StargateVestingAdapter } from './stargate/products/vesting/stargateVestingAdapter'

// Add new protocols names below
export const Protocol = {
  Stargate: 'stargate',
  Example: 'example',
  AaveV2: 'aave-v2',
} as const
export type Protocol = (typeof Protocol)[keyof typeof Protocol]

// Add your adapters below
export const supportedProtocols: Record<
  Protocol,
  Partial<
    Record<
      Chain,
      ((provider: ethers.providers.StaticJsonRpcProvider) => IProtocolAdapter)[]
    >
  >
> = {
  [Protocol.Stargate]: {
    [Chain.Ethereum]: [
      (provider) =>
        new StargatePoolAdapter({
          metadata: ETHEREUM_POOL_METADATA,
          chainId: Chain.Ethereum,
          provider,
        }),
      (provider) =>
        new StargateVestingAdapter({
          metadata: ETHEREUM_VESTING_METADATA,
          chainId: Chain.Ethereum,
          provider,
        }),
    ],
    [Chain.Arbitrum]: [
      (provider) =>
        new StargatePoolAdapter({
          metadata: ARBITRUM_POOL_METADATA,
          chainId: Chain.Arbitrum,
          provider,
        }),
    ],
  },

  [Protocol.Example]: {
    [Chain.Ethereum]: [
      (provider) =>
        new ExampleProductAdapter({
          metadata: {},
          chainId: Chain.Ethereum,
          provider,
        }),
    ],
  },

  [Protocol.AaveV2]: {
    [Chain.Ethereum]: [
      (provider) =>
        new AaveV2ATokenPoolAdapter({
          metadata: AAVE_V2_ETHEREUM_A_TOKEN_POOL_METADATA,
          chainId: Chain.Ethereum,
          provider,
        }),
      (provider) =>
        new AaveV2StableDebtTokenPoolAdapter({
          metadata: AAVE_V2_ETHEREUM_STABLE_DEBT_TOKEN_POOL_METADATA,
          chainId: Chain.Ethereum,
          provider,
        }),
      (provider) =>
        new AaveV2VariableDebtTokenPoolAdapter({
          metadata: AAVE_V2_ETHEREUM_VARIABLE_DEBT_TOKEN_POOL_METADATA,
          chainId: Chain.Ethereum,
          provider,
        }),
    ],
    [Chain.Polygon]: [
      (provider) =>
        new AaveV2ATokenPoolAdapter({
          metadata: AAVE_V2_POLYGON_A_TOKEN_POOL_METADATA,
          chainId: Chain.Polygon,
          provider,
        }),
      (provider) =>
        new AaveV2StableDebtTokenPoolAdapter({
          metadata: AAVE_V2_POLYGON_STABLE_DEBT_TOKEN_POOL_METADATA,
          chainId: Chain.Polygon,
          provider,
        }),
      (provider) =>
        new AaveV2VariableDebtTokenPoolAdapter({
          metadata: AAVE_V2_POLYGON_VARIABLE_DEBT_TOKEN_POOL_METADATA,
          chainId: Chain.Polygon,
          provider,
        }),
    ],
    [Chain.Avalanche]: [
      (provider) =>
        new AaveV2ATokenPoolAdapter({
          metadata: AAVE_V2_AVALANCHE_A_TOKEN_POOL_METADATA,
          chainId: Chain.Avalanche,
          provider,
        }),
      (provider) =>
        new AaveV2StableDebtTokenPoolAdapter({
          metadata: AAVE_V2_AVALANCHE_STABLE_DEBT_TOKEN_POOL_METADATA,
          chainId: Chain.Avalanche,
          provider,
        }),
      (provider) =>
        new AaveV2VariableDebtTokenPoolAdapter({
          metadata: AAVE_V2_AVALANCHE_VARIABLE_DEBT_TOKEN_POOL_METADATA,
          chainId: Chain.Avalanche,
          provider,
        }),
    ],
  },
}
