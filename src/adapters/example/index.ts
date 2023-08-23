import { SupportedChains } from '..'
import { Chain } from '../../core/constants/chains'
import { ExampleAdapter } from './products/exampleProduct/exampleAdapter'

export const exampleAdapter: SupportedChains = {
  [Chain.Ethereum]: [
    (provider) =>
      new ExampleAdapter({
        metadata: {},
        chainId: Chain.Ethereum,
        provider,
      }),
  ],
  [Chain.Arbitrum]: [
    (provider) =>
      new ExampleAdapter({
        metadata: {},
        chainId: Chain.Arbitrum,
        provider,
      }),
  ],
}
