import { Chain } from '../../../core/constants/chains.js'

export const contractAddresses: Partial<
  Record<Chain, { comptrollerAddress: string; cUSDCv3Address: string }>
> = {
  [Chain.Ethereum]: {
    comptrollerAddress: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
    cUSDCv3Address: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  },
}
