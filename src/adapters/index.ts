import { Chain } from '../core/constants/chains.js'
import { IProtocolAdapter, ProtocolAdapterParams } from '../types/adapter.js'
import { AaveV2ATokenPoolAdapter } from './aave-v2/products/pool/aaveV2ATokenPoolAdapter.js'
import { AaveV2StableDebtTokenPoolAdapter } from './aave-v2/products/pool/aaveV2StableDebtTokenPoolAdapter.js'
import { AaveV2VariableDebtTokenPoolAdapter } from './aave-v2/products/pool/aaveV2VariableDebtTokenPoolAdapter.js'
import { ExampleProductAdapter } from './example/products/example-product/exampleProductAdapter.js'
import { StargatePoolAdapter } from './stargate/products/pool/stargatePoolAdapter.js'
import { StargateVestingAdapter } from './stargate/products/vesting/stargateVestingAdapter.js'

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
    Record<Chain, (new (input: ProtocolAdapterParams) => IProtocolAdapter)[]>
  >
> = {
  [Protocol.Stargate]: {
    [Chain.Ethereum]: [StargatePoolAdapter, StargateVestingAdapter],
    [Chain.Arbitrum]: [StargatePoolAdapter, StargateVestingAdapter],
  },

  [Protocol.Example]: {
    [Chain.Ethereum]: [ExampleProductAdapter],
  },

  [Protocol.AaveV2]: {
    [Chain.Ethereum]: [
      AaveV2ATokenPoolAdapter,
      AaveV2StableDebtTokenPoolAdapter,
      AaveV2VariableDebtTokenPoolAdapter,
    ],
    [Chain.Polygon]: [
      AaveV2ATokenPoolAdapter,
      AaveV2StableDebtTokenPoolAdapter,
      AaveV2VariableDebtTokenPoolAdapter,
    ],
    [Chain.Avalanche]: [
      AaveV2ATokenPoolAdapter,
      AaveV2StableDebtTokenPoolAdapter,
      AaveV2VariableDebtTokenPoolAdapter,
    ],
  },
}
