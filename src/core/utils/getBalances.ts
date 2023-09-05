import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { GetBalancesInput, TokenBalance } from '../../types/adapter'
import { filterMap } from './filters'
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
      balance: formatUnits(BigNumber.from(balance), token.decimals),
    }
  })
}
