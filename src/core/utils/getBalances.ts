import { GetBalancesInput, TokenBalance } from '../../types/adapter'
import { filterMapSync } from './filters'
import { getAddressesBalances } from './getAddressesBalances'

export const getBalances = async ({
  chainId,
  provider,
  userAddress,
  blockNumber,
  tokens,
}: GetBalancesInput): Promise<TokenBalance[]> => {
  const balances = await getAddressesBalances({
    chainId,
    provider,
    addresses: [userAddress],
    tokens: tokens.map(({ address }) => address),
    blockNumber,
  })

  return filterMapSync(tokens, (token) => {
    const balance = balances[userAddress]?.[token.address]
    if (!balance || balance === 0n) {
      return undefined
    }

    return {
      ...token,
      balanceRaw: balance,
    }
  })
}
