import { Chain } from './core/constants/chains'
import { IMetadataProvider } from './SQLiteMetadataProvider'

export class VoidMetadataProvider implements IMetadataProvider {
  async getMetadata() {
    return []
  }

  async getPoolCount() {
    return 0
  }
}

export function buildVoidMetadataProviders(): Record<Chain, IMetadataProvider> {
  return Object.values(Chain).reduce(
    (acc, chainId) => {
      acc[chainId] = new VoidMetadataProvider()
      return acc
    },
    {} as Record<Chain, IMetadataProvider>,
  )
}
