import { Chain } from '../core/constants/chains'
import { Protocol } from '../core/constants/protocols'
import { IProtocolAdapter } from '../types/adapter'
import { stargateAdapters } from './stargate'

import { exampleAdapter } from './example'
import { ethers } from 'ethers'

export type SupportedChains = {
  [key in Chain]?: ((
    provider: ethers.providers.StaticJsonRpcProvider,
    ...props: unknown[]
  ) => IProtocolAdapter)[]
}

export const supportedProtocols: Record<Protocol, SupportedChains> = {
  [Protocol.Stargate]: stargateAdapters,
  [Protocol.Example]: exampleAdapter,
}
