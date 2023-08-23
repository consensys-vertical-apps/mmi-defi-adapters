import { Chain } from '../core/constants/chains'
import { Protocol } from '../core/constants/protocols'
import { IProtocolAdapter } from '../types/adapter'
import { stargateAdapters } from './stargate'

import { exampleAdapter } from './example'

export type SupportedChains = {
  [key in Chain]?: IProtocolAdapter[]
}

export const supportedProtocols: Record<Protocol, SupportedChains> = {
  [Protocol.Stargate]: stargateAdapters,
  [Protocol.Example]: exampleAdapter,
}
