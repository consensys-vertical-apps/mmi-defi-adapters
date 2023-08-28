import { ethers } from 'ethers'
import {
  Multicall,
  ContractCallResults,
  ContractCallContext,
} from 'ethereum-multicall'
import { GetPositionsInput, TokenBalance } from '../../types/adapter'
import { ERC20 } from './getTokenMetadata'
import { formatUnits } from 'ethers/lib/utils'
import { filterMap } from './filters'
import ERC20Abi from '../../contracts/abis/erc20.json'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'

export type GetBalancesInput = GetPositionsInput & {
  provider: ethers.providers.StaticJsonRpcProvider
  tokens: ERC20[]
}

export const getBalances = async ({
  provider,
  userAddress,
  blockNumber,
  tokens,
}: GetBalancesInput): Promise<TokenBalance[]> => {
  const multicall = new Multicall({
    ethersProvider: provider,
    tryAggregate: true,
  })

  const contractCallContext: ContractCallContext[] = filterMap(
    tokens,
    (token) => {
      if (token.address === ZERO_ADDRESS) {
        return undefined
      }

      return {
        reference: token.address,
        contractAddress: token.address,
        abi: ERC20Abi,
        calls: [
          {
            reference: 'balanceOfCall',
            methodName: 'balanceOf',
            methodParameters: [userAddress],
          },
        ],
      }
    },
  )

  const { results }: ContractCallResults = await multicall.call(
    contractCallContext,
    { blockNumber: blockNumber?.toString() },
  )

  let userBalance: string | undefined
  if (tokens.find((token) => token.address === ZERO_ADDRESS)) {
    userBalance = (await provider.getBalance(userAddress)).toHexString()
  }

  const tokenBalances = filterMap(tokens, (token) => {
    const tokenBalanceHex =
      token.address === ZERO_ADDRESS
        ? userBalance
        : (results[token.address]?.callsReturnContext[0]?.returnValues[0]
            ?.hex as string | undefined)
    if (!tokenBalanceHex) {
      throw new Error('Failed to fetch balance')
    }

    const tokenBalance = BigInt(tokenBalanceHex)
    if (!tokenBalance) {
      return undefined
    }

    return {
      ...token,
      balanceRaw: tokenBalance,
      balance: formatUnits(tokenBalance, token.decimals),
    }
  })

  return tokenBalances
}
