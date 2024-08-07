import { Erc20Metadata } from '../../../../types/erc20Metadata'

export type RcowMetadataEntry = {
  protocolToken: Erc20Metadata
  underlyingToken: Erc20Metadata
  rewardTokens: Erc20Metadata[]
}

export type TcowMetadata = Record<string, RcowMetadataEntry>
