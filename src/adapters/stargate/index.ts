import { Chain } from '../../core/constants/chains'
import { chainProviders } from '../../core/utils/chainProviders'
import { SupportedChains } from '..'
import { StargatePoolAdapter } from './products/pool/stargatePoolAdapter'
import ARBITRUM_POOL_METADATA from './products/pool/arbitrum/metadata.json'
import ETHEREUM_POOL_METADATA from './products/pool/ethereum/metadata.json'
import { StargateVestingAdapter } from './products/vesting/stargateVestingAdapter'
import ETHEREUM_VESTING_METADATA from './products/vesting/ethereum/metadata.json'

export const stargateAdapters: SupportedChains = {
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
}
