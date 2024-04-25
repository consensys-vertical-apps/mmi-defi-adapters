import { getAddress } from 'ethers'
import { Chain } from '../../../../core/constants/chains'

const OneInchPriceOracleCommon = getAddress(
  '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
)

export const priceAdapterConfig = {
  [Chain.Ethereum]: {
    wrappedEth: getAddress('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'),
    oracle: OneInchPriceOracleCommon,
    chainlinkUsdEthFeed: getAddress(
      '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
    ),
    wrappedToken: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: getAddress('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'),
      decimals: 18,
    },
    decimals: 18,
    chainlinkDecimals: 8,
  },
  [Chain.Optimism]: {
    wrappedEth: getAddress('0x4200000000000000000000000000000000000006'),
    oracle: OneInchPriceOracleCommon,
    chainlinkUsdEthFeed: getAddress(
      '0x13e3ee699d1909e989722e753853ae30b17e08c5',
    ),

    wrappedToken: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: getAddress('0x4200000000000000000000000000000000000006'),
      decimals: 18,
    },
    decimals: 18,
    chainlinkDecimals: 8,
  },
  [Chain.Bsc]: {
    oracle: OneInchPriceOracleCommon,
    wrappedEth: getAddress('0x2170ed0880ac9a755fd29b2688956bd959f933f8'),
    chainlinkUsdEthFeed: getAddress(
      '0x9ef1b8c0e4f7dc8bf5719ea496883dc6401d5b2e',
    ),

    wrappedToken: {
      symbol: 'WBNB',
      name: 'Wrapped BNB',
      address: getAddress('0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'),
      decimals: 18,
    },
    decimals: 18,
    chainlinkDecimals: 8,
  },
  [Chain.Polygon]: {
    wrappedEth: getAddress('0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'),
    oracle: OneInchPriceOracleCommon,
    chainlinkUsdEthFeed: getAddress(
      '0xf9680d99d6c9589e2a93a78a04a279e509205945',
    ),

    wrappedToken: {
      symbol: 'WMATIC',
      name: 'Wrapped Matic',
      address: getAddress('0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'),
      decimals: 18,
    },
    decimals: 18,
    chainlinkDecimals: 8,
  },

  [Chain.Arbitrum]: {
    wrappedEth: getAddress('0x82af49447d8a07e3bd95bd0d56f35241523fbab1'),
    oracle: OneInchPriceOracleCommon,
    chainlinkUsdEthFeed: getAddress(
      '0x639fe6ab55c921f74e7fac1ee960c0b6293ba612',
    ),

    wrappedToken: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: getAddress('0x82af49447d8a07e3bd95bd0d56f35241523fbab1'),
      decimals: 18,
    },
    decimals: 18,
    chainlinkDecimals: 8,
  },
  [Chain.Avalanche]: {
    oracle: OneInchPriceOracleCommon,
    wrappedEth: getAddress('0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab'),
    chainlinkUsdEthFeed: getAddress(
      '0x976b3d034e162d8bd72d6b9c989d545b839003b0',
    ),

    wrappedToken: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: getAddress('0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab'),
      decimals: 18,
    },
    decimals: 18,
    chainlinkDecimals: 8,
  },
  [Chain.Base]: {
    oracle: OneInchPriceOracleCommon,
    wrappedEth: getAddress('0x4200000000000000000000000000000000000006'),
    chainlinkUsdEthFeed: getAddress(
      '0x71041dddad3595f9ced3dccfbe3d1f4b0a16bb70',
    ),

    wrappedToken: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: getAddress('0x4200000000000000000000000000000000000006'),
      decimals: 18,
    },
    decimals: 18,
    chainlinkDecimals: 8,
  },
}
