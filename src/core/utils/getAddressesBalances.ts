import BalanceCheckerABI from 'eth-balance-checker/abis/BalanceChecker.abi.json'
import { formatAddressBalances } from 'eth-balance-checker/lib/common'
import { BigNumber, Contract, ethers } from 'ethers'
import { Chain } from '../constants/chains'

// Addresses extracted from https://github.com/wbobeirne/eth-balance-checker
const BALANCE_CHECKER_CONTRACT_ADDRESS: Record<Chain, string> = {
  [Chain.Ethereum]: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39',
  [Chain.Optimism]: '0xB1c568e9C3E6bdaf755A60c7418C269eb11524FC',
  [Chain.Bsc]: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4',
  [Chain.Polygon]: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4',
  [Chain.Fantom]: '0x07f697424ABe762bB808c109860c04eA488ff92B',
  [Chain.Base]: '0xd70e1fa2ae720f585259bc6691feaeeb64fc7cc3',
  [Chain.Arbitrum]: '0x151E24A486D7258dd7C33Fb67E4bB01919B7B32c',
  [Chain.Avalanche]: '0xD023D153a0DFa485130ECFdE2FAA7e612EF94818',
  [Chain.Linea]: '0xd70e1fa2ae720f585259bc6691feaeeb64fc7cc3',
}

export async function getAddressesBalances({
  chainId,
  provider,
  addresses,
  tokens,
  blockNumber,
}: {
  chainId: Chain
  provider: ethers.providers.StaticJsonRpcProvider
  addresses: string[]
  tokens: string[]
  blockNumber?: number
}) {
  const contractAddress = BALANCE_CHECKER_CONTRACT_ADDRESS[chainId]
  if (!contractAddress) {
    throw new Error('Multicall balance checker not supported for this chain')
  }

  const contract = new Contract(contractAddress, BalanceCheckerABI, provider)

  const balances = await contract.balances(addresses, tokens, {
    blockTag: blockNumber,
  })

  return formatAddressBalances<BigNumber>(balances, addresses, tokens)
}
