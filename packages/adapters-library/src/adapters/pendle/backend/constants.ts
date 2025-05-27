import { Chain } from '../../../core/constants/chains'

// Extract from files here: https://github.com/pendle-finance/pendle-core-v2-public/blob/main/deployments/1-core.json
export const PENDLE_ROUTER_STATIC_CONTRACT: Partial<Record<Chain, string>> = {
  [Chain.Ethereum]: '0x263833d47eA3fA4a30f269323aba6a107f9eB14C',
  [Chain.Optimism]: '0x704478Dd72FD7F9B83d1F1e0fc18C14B54F034d0',
  [Chain.Bsc]: '0x2700ADB035F82a11899ce1D3f1BF8451c296eABb',
  [Chain.Base]: '0xB4205a645c7e920BD8504181B1D7f2c5C955C3e7',
  [Chain.Arbitrum]: '0xAdB09F65bd90d19e3148D9ccb693F3161C6DB3E8',
}
