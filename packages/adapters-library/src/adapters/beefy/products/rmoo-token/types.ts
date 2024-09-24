import { Erc20Metadata } from '../../../../types/erc20Metadata'

export type RmooMetadataEntry = {
  protocolToken: Erc20Metadata
  underlyingToken: Erc20Metadata
  rewardTokens: Erc20Metadata[]
}

export type RmooMetadata = Record<string, RmooMetadataEntry>
