import { formatUnits } from 'ethers'
import { GetBalancesInput, TokenBalance } from '../../types/adapter.js'
import { filterMap } from './filters.js'
import { getAddressesBalances } from './getAddressesBalances.js'

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
    blockNumber: blockNumber,
  })

  return filterMap(tokens, (token) => {
    const balance = balances[userAddress]?.[token.address]
    if (!balance || balance === '0') {
      return undefined
    }

    return {
      ...token,
      balanceRaw: BigInt(balance),
      balance: formatUnits(balance, token.decimals),
    }
  })
}
