import { filterMap } from './filters'
import { getAddressesBalances } from './getBalances'

import { TokenBalance } from '../../types/response'

import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { GetBalancesInput } from '../../types/adapter'

export const getBalances = async ({
  chainId,
  provider,
  userAddress,
  blockNumber,
  lpTokens,
}: GetBalancesInput): Promise<TokenBalance[]> => {
  const balances = await getAddressesBalances({
    chainId,
    provider,
    addresses: [userAddress],
    tokens: lpTokens.map(({ address }) => address),
    blockNumber: blockNumber,
  })

  return filterMap(lpTokens, (lpToken) => {
    const balance = balances[userAddress]?.[lpToken.address]
    if (!balance || balance === '0') {
      return undefined
    }

    return {
      ...lpToken,
      balanceRaw: BigInt(balance),
      balance: formatUnits(BigNumber.from(balance), lpToken.decimals),
    }
  })
}
