import { getAddress } from 'ethers'
import { E_ADDRESS } from '../constants/E_ADDRESS'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { Chain } from '../constants/chains'

const ETH = {
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
}

export const nativeTokenAddresses = [
  ZERO_ADDRESS,
  E_ADDRESS,
  getAddress('0x4200000000000000000000000000000000000006'), // WETH on Optimism
  getAddress('0x0000000000000000000000000000000000001010'), // native token on polygon matic
]

export const nativeToken = {
  [Chain.Ethereum]: ETH,
  [Chain.Optimism]: ETH,
  [Chain.Bsc]: { name: 'Binance Coin', symbol: 'BNB', decimals: 18 },
  [Chain.Polygon]: {
    name: 'Matic Network Token',
    symbol: 'MATIC',
    decimals: 18,
  },

  [Chain.Arbitrum]: ETH,
  [Chain.Avalanche]: ETH,
  [Chain.Base]: ETH,
  [Chain.Linea]: ETH,
  [Chain.Fantom]: {
    name: 'Fantom',
    symbol: 'FTM',
    decimals: 18,
  },
  [Chain.Solana]: {
    address: 'So11111111111111111111111111111111111111112',
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
  },
} as const
