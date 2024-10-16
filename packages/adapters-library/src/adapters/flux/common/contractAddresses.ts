import { Chain } from '../../../core/constants/chains.js'

export const contractAddresses: Partial<
  Record<Chain, { comptrollerAddress: string }>
> = {
  [Chain.Ethereum]: {
    comptrollerAddress: '0x95Af143a021DF745bc78e845b54591C53a8B3A51',
  },
}
