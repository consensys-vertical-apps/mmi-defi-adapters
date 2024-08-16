import { getAddress } from 'ethers'
import { mergeWith } from 'lodash'
import { Chain } from '../../../../core/constants/chains'

export interface TokenInfo {
  protocolToken: string
  underlyingToken: string
}

const SolvBtcTokenAddresses: Partial<Record<Chain, TokenInfo[]>> = {
  [Chain.Ethereum]: [
    {
      protocolToken: getAddress('0x7a56e1c57c7475ccf742a1832b028f0456652f97'),
      underlyingToken: getAddress('0xC96dE26018A54D51c097160568752c4E3BD6C364'), // FBTC
    },
  ],
  [Chain.Bsc]: [
    {
      protocolToken: getAddress('0x4aae823a6a0b376de6a78e74ecc5b079d38cbcf7'),
      underlyingToken: getAddress('0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c'), // BTCB
    },
  ],
  [Chain.Arbitrum]: [
    {
      protocolToken: getAddress('0x3647c54c4c2c65bc7a2d63c0da2809b399dbbdc0'),
      underlyingToken: getAddress('0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'), // WBTC
    },
  ],
  [Chain.Avalanche]: [
    {
      protocolToken: getAddress('0xbc78d84ba0c46dfe32cf2895a19939c86b81a777'),
      underlyingToken: getAddress('0x152b9d0FdC40C096757F570A51E494bd4b943E50'), // BTC.b
    },
  ],
}

const SolvBtcBbnTokenAddresses: Partial<Record<Chain, TokenInfo[]>> = {
  [Chain.Ethereum]: [
    {
      protocolToken: getAddress('0xd9d920aa40f578ab794426f5c90f6c731d159def'),
      underlyingToken: SolvBtcTokenAddresses[Chain.Ethereum]![0]!.protocolToken,
    },
  ],
  [Chain.Bsc]: [
    {
      protocolToken: getAddress('0x1346b618dc92810ec74163e4c27004c921d446a5'),
      underlyingToken: SolvBtcTokenAddresses[Chain.Bsc]![0]!.protocolToken,
    },
  ],
  [Chain.Arbitrum]: [
    {
      protocolToken: getAddress('0x346c574c56e1a4aaa8dc88cda8f7eb12b39947ab'),
      underlyingToken: SolvBtcTokenAddresses[Chain.Arbitrum]![0]!.protocolToken,
    },
  ],
}

const SolvBtcEnaTokenAddresses: Partial<Record<Chain, TokenInfo[]>> = {
  [Chain.Ethereum]: [
    {
      protocolToken: getAddress('0x325dc9ebcec31940c658acaca45f8293418d811e'),
      underlyingToken: SolvBtcTokenAddresses[Chain.Ethereum]![0]!.protocolToken,
    },
  ],
  [Chain.Bsc]: [
    {
      protocolToken: getAddress('0x53e63a31fd1077f949204b94f431bcab98f72bce'),
      underlyingToken: SolvBtcTokenAddresses[Chain.Bsc]![0]!.protocolToken,
    },
  ],
  [Chain.Arbitrum]: [
    {
      protocolToken: getAddress('0xafafd68afe3fe65d376eec9eab1802616cfaccb8'),
      underlyingToken: SolvBtcTokenAddresses[Chain.Arbitrum]![0]!.protocolToken,
    },
  ],
}

/**
 * Merge the above records in a single object strcutured like this:
 *
 * {
 *   '1': [ {protocolToken: '...', underlyingToken: '...'}, {protocolToken: '...', underlyingToken: '...'}, ...]
 *   '56': [ {protocolToken: '...', underlyingToken: '...'}, {protocolToken: '...', underlyingToken: '...'}, ...]
 *   ...
 * }
 */
export const TokenAddresses = mergeWith(
  {},
  SolvBtcTokenAddresses,
  SolvBtcBbnTokenAddresses,
  SolvBtcEnaTokenAddresses,
  (objValue, srcValue) =>
    Array.isArray(objValue) ? objValue.concat(srcValue) : undefined,
)
