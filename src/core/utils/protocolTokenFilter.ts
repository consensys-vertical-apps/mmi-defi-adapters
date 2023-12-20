import { Erc20Metadata } from '../../types/erc20Metadata'

export function filterTokens(
  tokens: Erc20Metadata[],
  addressFilter?: string[],
): Erc20Metadata[] {
  return tokens.filter(
    (protocolToken) =>
      !addressFilter || addressFilter.includes(protocolToken.address),
  )
}
