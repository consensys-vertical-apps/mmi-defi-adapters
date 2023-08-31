import { ethers } from 'ethers'
import { Chain } from '../core/constants/chains'
import { IProtocolAdapter } from '../types/adapter'
import { StargatePoolAdapter } from './stargate/products/pool/stargatePoolAdapter'
import { StargateVestingAdapter } from './stargate/products/vesting/stargateVestingAdapter'
import ETHEREUM_VESTING_METADATA from './stargate/products/vesting/ethereum/metadata.json'
import ETHEREUM_POOL_METADATA from './stargate/products/pool/ethereum/metadata.json'
import ARBITRUM_POOL_METADATA from './stargate/products/pool/arbitrum/metadata.json'

import { ExampleProductAdapter } from './example/products/example-product/exampleProductAdapter'

// Add new protocols names below
export const Protocol = {
  Stargate: 'stargate',
  Example: 'example',
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
}
