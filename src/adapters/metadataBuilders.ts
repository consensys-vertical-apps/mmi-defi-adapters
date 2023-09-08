import { Chain } from '../core/constants/chains'
import { buildMetadata as buildAave2Metadata } from './aave-v2/buildMetadata'
import { buildMetadata as buildStargateMetadata } from './stargate/buildMetadata'
import { Protocol } from '.'

export type ProtocolMetadataBuilders = {
  [key in Chain]?: () => Promise<void>
}

export const protocolMetadataBuilders: Partial<
  Record<Protocol, ProtocolMetadataBuilders>
> = {
  [Protocol.Stargate]: {
    [Chain.Ethereum]: () => buildStargateMetadata(Chain.Ethereum),
    [Chain.Arbitrum]: () => buildStargateMetadata(Chain.Arbitrum),
  },
  [Protocol.AaveV2]: {
    [Chain.Ethereum]: () => buildAave2Metadata(Chain.Ethereum),
    [Chain.Polygon]: () => buildAave2Metadata(Chain.Polygon),
    [Chain.Avalanche]: () => buildAave2Metadata(Chain.Avalanche),
  },
}
