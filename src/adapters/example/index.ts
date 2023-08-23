import { Chain } from '../../core/constants/chains'
import { chainProviders } from '../../core/utils/chainProviders'

import { ExampleAdapter } from './products/exampleProduct/exampleAdapter'

export const exampleAdapter = {
  [Chain.Ethereum]: [
    new ExampleAdapter({
      metadata: {},
      chainId: Chain.Ethereum,
      provider: chainProviders[Chain.Ethereum]!,
    }),
  ],
  [Chain.Arbitrum]: [
    new ExampleAdapter({
      metadata: {},
      chainId: Chain.Arbitrum,
      provider: chainProviders[Chain.Ethereum]!,
    }),
  ],
}
