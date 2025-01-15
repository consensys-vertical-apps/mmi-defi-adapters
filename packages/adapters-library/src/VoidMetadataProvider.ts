import { IMetadataProvider } from './SQLiteMetadataProvider'
import { Chain } from './core/constants/chains'
import { ProtocolToken } from './types/IProtocolAdapter'

export class VoidMetadataProvider implements IMetadataProvider {
  allTokens: Promise<Map<string, ProtocolToken[]>> = Promise.resolve(new Map())

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
