import { getAddress } from 'ethers'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { Chain } from '../constants/chains'

const ETH = {
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
}

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

export const nativeTokenAddresses = [
  ZERO_ADDRESS,
  getAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'),
  getAddress('0x4200000000000000000000000000000000000006'),
  getAddress('0x0000000000000000000000000000000000001010'), // native token on polygon matic
  nativeToken[Chain.Solana].address,
]
