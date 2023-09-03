import { Chain } from '../core/constants/chains'
import { buildMetadata } from './stargate/buildMetadata'
import { Protocol } from '.'

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
