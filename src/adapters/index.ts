import { Chain } from '../core/constants/chains'
import { chainProviders } from '../core/utils/chainProviders'
import { StargatePoolAdapter } from './stargate/products/pool/stargatePoolAdapter'
import { StargateVestingAdapter } from './stargate/products/vesting/stargateVestingAdapter'
import { ExampleAdapter } from './example/products/exampleProduct/exampleAdapter'
import ETHEREUM_VESTING_METADATA from './stargate/products/vesting/ethereum/metadata.json'
import ETHEREUM_POOL_METADATA from './stargate/products/pool/ethereum/metadata.json'
import ARBITRUM_POOL_METADATA from './stargate/products/pool/arbitrum/metadata.json'
import { IProtocolAdapter } from '../types/adapter'

// Add new protocols names below
export const Protocol = {
  Stargate: 'stargate',
  Example: 'example',
} as const
export type Protocol = (typeof Protocol)[keyof typeof Protocol]

// Add your adapters below
export const supportedProtocols: Record<
  Protocol,
  Partial<Record<Chain, IProtocolAdapter[]>>
> = {
  [Protocol.Stargate]: {
    [Chain.Ethereum]: [
      new StargatePoolAdapter({
        metadata: ETHEREUM_POOL_METADATA,
        chainId: Chain.Ethereum,
        provider: chainProviders[Chain.Ethereum]!,
      }),
      new StargateVestingAdapter({
        metadata: ETHEREUM_VESTING_METADATA,
        chainId: Chain.Ethereum,
        provider: chainProviders[Chain.Ethereum]!,
      }),
    ],
    [Chain.Arbitrum]: [
      new StargatePoolAdapter({
        metadata: ARBITRUM_POOL_METADATA,
        chainId: Chain.Arbitrum,
        provider: chainProviders[Chain.Arbitrum]!,
      }),
    ],
  },
  [Protocol.Example]: {
    [Chain.Ethereum]: [
      new ExampleAdapter({
        metadata: {},
        chainId: Chain.Ethereum,
        provider: chainProviders[Chain.Ethereum]!,
      }),
    ],
  },
}
