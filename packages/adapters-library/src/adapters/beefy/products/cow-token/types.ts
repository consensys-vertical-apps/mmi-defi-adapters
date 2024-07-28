import { Erc20Metadata } from '../../../../types/erc20Metadata'

export type CowMetadataEntry = {
  protocolToken: Erc20Metadata
  underlyingTokens: Erc20Metadata[]
}

export type CowMetadata = Record<string, CowMetadataEntry>
