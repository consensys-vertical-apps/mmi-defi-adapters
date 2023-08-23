import { Chain } from '../../core/constants/chains'
import { SupportedChains } from '..'
import { StargatePoolAdapter } from './products/pool/stargatePoolAdapter'
import ARBITRUM_POOL_METADATA from './products/pool/arbitrum/metadata.json'
import ETHEREUM_POOL_METADATA from './products/pool/ethereum/metadata.json'
import { StargateVestingAdapter } from './products/vesting/stargateVestingAdapter'
import ETHEREUM_VESTING_METADATA from './products/vesting/ethereum/metadata.json'

export const stargateAdapters: SupportedChains = {
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
}
