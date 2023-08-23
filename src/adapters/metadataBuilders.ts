import { Chain } from '../core/constants/chains'
import { Protocol } from '../core/constants/protocols'
import { buildMetadata } from './stargate/buildMetadata'

export type ProtocolMetadataBuilders = {
  [key in Chain]?: () => Promise<void>
}

export const protocolMetadataBuilders: Partial<
  Record<Protocol, ProtocolMetadataBuilders>
> = {
  [Protocol.Stargate]: {
    [Chain.Ethereum]: () => buildMetadata(Chain.Ethereum),
    [Chain.Arbitrum]: () => buildMetadata(Chain.Arbitrum),
  },
}
