import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { ProtocolUnwrapType } from '../../sdk/types'

export type MetadataEntry = {
  protocolToken: Erc20Metadata
  underlyingTokens: Erc20Metadata[]
  unwrapType: ProtocolUnwrapType
  underlyingLPToken: Erc20Metadata
}

export type Metadata = Record<string, MetadataEntry>
