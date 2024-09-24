import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { ProtocolUnwrapType } from '../../sdk/types'

export type MooMetadataEntry = {
  protocolToken: Erc20Metadata
  underlyingTokens: Erc20Metadata[]
  unwrapType: ProtocolUnwrapType
  underlyingLPToken: Erc20Metadata
}

export type MooMetadata = Record<string, MooMetadataEntry>
