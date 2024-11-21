import { getAddress } from 'ethers'
import { Chain } from '../../../core/constants/chains'

export const PX_ETH_DEPLOYMENTS: Partial<Record<Chain, string>> = {
  [Chain.Ethereum]: getAddress('0x04C154b66CB340F3Ae24111CC767e0184Ed00Cc6'),
  [Chain.Optimism]: getAddress('0x300d2c875c6fb8ce4bf5480b4d34b7c9ea8a33a4'),
  [Chain.Arbitrum]: getAddress('0x300d2c875c6fb8ce4bf5480b4d34b7c9ea8a33a4'),
  [Chain.Bsc]: getAddress('0x300d2c875c6fb8ce4bf5480b4d34b7c9ea8a33a4'),
  [Chain.Base]: getAddress('0x58adE43A276ddF3e101941571eDe398a32492Ed7'),
  [Chain.Linea]: getAddress('0x58adE43A276ddF3e101941571eDe398a32492Ed7'),
}

export const APX_ETH_DEPLOYMENTS: Partial<Record<Chain, string>> = {
  [Chain.Ethereum]: getAddress('0x9Ba021B0a9b958B5E75cE9f6dff97C7eE52cb3E6'),
  [Chain.Optimism]: getAddress('0x16ed8e219cde31e14a80dcb6c9127a5ec6e88e46'),
  [Chain.Arbitrum]: getAddress('0x16ed8e219cde31e14a80dcb6c9127a5ec6e88e46'),
  [Chain.Bsc]: getAddress('0x16ed8e219cde31e14a80dcb6c9127a5ec6e88e46'),
  [Chain.Base]: getAddress('0xEd97D39448D1c3891aAFCb28c9CF63F893D65743'),
  [Chain.Linea]: getAddress('0xEd97D39448D1c3891aAFCb28c9CF63F893D65743'),
}
