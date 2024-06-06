import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Base,
    method: 'positions',

    input: {
      userAddress: '0x50fa50fa2032d85eb2dda303929bf56886aa9afb',

      filterProtocolTokens: [
        '0xb63682961B3dC55d2aD8AD756beAEcDDe8474E83',
        '0x4Fc0E7cDfe0CF92762eaf3CEE9133239A2197391',
        '0x92868C059CfCd035ea204e3163Bd84b308dD358e',
      ],
    },

    blockNumber: 15374682,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: [
        '0xb39a6c02BB32199c5C2e937a9c96Fe8F79E18763',
        '0x3bAa857646e5A0B475E75a1dbD38E7f0a6742058',
        '0xd37025aC6227334C7762AeD5929Ce3272fbb6fdC',
      ],
    },
    blockNumber: 219137472,
  },
  {
    chainId: Chain.Avalanche,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
    },
    blockNumber: 19187298,
  },
  {
    chainId: Chain.Bsc,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: [
        '0x2A1b2B05A3c54C86F3f3AB837cA423ad60CF35d1',
        '0xA5d3c08E0afb5F4d2428630e10d31DC53a14e2E5',
      ],
    },
    blockNumber: 39386513,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: [
        '0x5dA90BA82bED0AB701E6762D2bF44E08634d9776',
        '0x1153211f7E810C73cC45eE09FF9A0742fBB6b467',
        '0x3E1c2C604f60ef142AADAA51aa864f8438f2aaC1',
        '0xAB28C317B34084f29d7623208b5F09C0Dd566a18',
        '0x9E90aD4810C9eaE0ADFc15801838Dc53cC6ed48a',
        '0xB2975e68b3FAc3b8ff444660cc4cee907367EB0C',
        '0x8D719AD5Cc19d5413A9D11Bd39813847f352De65',
        '0x7628f57cAA83fa54909a5E46e55F0406dEcE56E6',
        '0x234Fd76985dA4fD505DbAF7A48e119Cd5dFD5C8F',
        '0xc2f9C3F4e4cdE519D5DeA9880C1CA6614E4b3d61',
        '0x4d7222Eee3c6b67F8e806D0f866B0D666D6182b3',
        '0xd4D620B23E91031fa08045b6083878f42558d6b9',
      ],
    },
    blockNumber: 20035548,
  },
  {
    chainId: Chain.Fantom,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
    },
    blockNumber: 82399236,
  },
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: [
        '0xc8F789da67E392e0C14dcD6C81404884199d9849',
        '0x5730Ba155FD95903c2706f1B2F8DBbBFB5e0a94c',
        '0x4859ac3c9aC0A9c35Dc807f79B78f7b9a6F4e7E4',
        '0x50fA947b08F879004220C42428524eaaf4eF9473',
        '0x8c0919AE1fAcD6695Ad236Ea618d1018e5c4d42c',
        '0x7168464Ac7330EC5177694005e60FBe319DC40c2',
        '0xe269c87F85C725bb9BF642aAeE1650bf5796B73B',
      ],
    },
    blockNumber: 5220484,
  },
  {
    chainId: Chain.Optimism,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: [
        '0x63289886Ad4Eb9364669741650cde780C9f2E7D2',
        '0xD9E277eA320C53dE06C535f0D922A76a68CB9A9C',
        '0x52cC5B5CB98C9a7fb8cCe7d4b4e8F41E26ce04a8',
        '0xef8D6dDE0a0f0CCdaDB678366a94D93f1C449689',
        '0x453f61390ce6DfB668bbF4D93E58c94BB0ae81f3',
        '0x28bAF22c85D146101198D1883281a83cBe063329',
      ],
    },
    blockNumber: 121055758,
  },
  {
    chainId: Chain.Polygon,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: [
        '0x1B197B90c86BF04D221D94F773e5C7984d6a1D4c',
        '0xf9Ba6b4f3386BEe60fE1f20e82CbEce530f6cbe1',
        '0x86aAd005769D9aedeb59df6e4B4b68974Bdd86fD',
        '0x0Aa691fE4188F6D6467269a401af393869C6e982',
        '0x44227C548272E2Dce4537746bcA4c8F036177B9e',
        '0x8CaA1a3809b3C67C61Eaf5524e1cB784ED6bA8B3',
        '0xc5d366eDF862F18d62831fb8333D335d625a4C00',
        '0xE7d054F4d4089F5F2A192B14A13714f2e96b491e',
        '0xd6E01db636054DEF591C744285318560Bf33CBab',
        '0xF42D47cAaD6fb299aCc998921EffeaDE5aBEe971',
        '0xf552a67A82908E6C7F4382b812218d665e058C0B',
        '0xec74671f95F0942358016da627b912143100DAF2',
        '0xAb4E02911A7d09BC8300F39332F087d51c183038',
        '0x0fC4f2DB534Bf7525710DBf64B7081e1a3A6428f',
        '0x5268F5F2a9799f747A55f193d2E266c77653E518',
        '0xD97FA4474084350D2c96285E1Fca07A9D515c800',
      ],
    },
    blockNumber: 57849653,
  },
  {
    chainId: Chain.Base,
    method: 'deposits',
    input: {
      fromBlock: 15190963,
      toBlock: 15192963,
      userAddress: '0x50fa50fa2032d85eb2dda303929bf56886aa9afb',
      protocolTokenAddress: '0xb63682961B3dC55d2aD8AD756beAEcDDe8474E83',
      productId: 'moo-token',
    },
  },

  {
    chainId: Chain.Arbitrum,
    method: 'deposits',
    input: {
      fromBlock: 219137472,
      toBlock: 219157472,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0xb39a6c02BB32199c5C2e937a9c96Fe8F79E18763',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Avalanche,
    method: 'deposits',
    input: {
      fromBlock: 19187298,
      toBlock: 19189298,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x3bAa857646e5A0B475E75a1dbD38E7f0a6742058',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Bsc,
    method: 'deposits',
    input: {
      fromBlock: 39386513,
      toBlock: 39388513,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x2A1b2B05A3c54C86F3f3AB837cA423ad60CF35d1',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      fromBlock: 20035548,
      toBlock: 20037548,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x5dA90BA82bED0AB701E6762D2bF44E08634d9776',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Fantom,
    method: 'deposits',
    input: {
      fromBlock: 82399236,
      toBlock: 82401236,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x5730Ba155FD95903c2706f1B2F8DBbBFB5e0a94c',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'deposits',
    input: {
      fromBlock: 5220484,
      toBlock: 5222484,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x4859ac3c9aC0A9c35Dc807f79B78f7b9a6F4e7E4',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Optimism,
    method: 'deposits',
    input: {
      fromBlock: 121055758,
      toBlock: 121057758,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x63289886Ad4Eb9364669741650cde780C9f2E7D2',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Polygon,
    method: 'deposits',
    input: {
      fromBlock: 57849653,
      toBlock: 57851653,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x1B197B90c86BF04D221D94F773e5C7984d6a1D4c',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Base,
    method: 'withdrawals',
    input: {
      fromBlock: 15190963,
      toBlock: 15192963,
      userAddress: '0x50fa50fa2032d85eb2dda303929bf56886aa9afb',
      protocolTokenAddress: '0xb63682961B3dC55d2aD8AD756beAEcDDe8474E83',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Arbitrum,
    method: 'withdrawals',
    input: {
      fromBlock: 219137472,
      toBlock: 219157472,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0xb39a6c02BB32199c5C2e937a9c96Fe8F79E18763',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Avalanche,
    method: 'withdrawals',
    input: {
      fromBlock: 19187298,
      toBlock: 19189298,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x3bAa857646e5A0B475E75a1dbD38E7f0a6742058',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Bsc,
    method: 'withdrawals',
    input: {
      fromBlock: 39386513,
      toBlock: 39388513,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x2A1b2B05A3c54C86F3f3AB837cA423ad60CF35d1',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      fromBlock: 20035548,
      toBlock: 20037548,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x5dA90BA82bED0AB701E6762D2bF44E08634d9776',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Fantom,
    method: 'withdrawals',
    input: {
      fromBlock: 82399236,
      toBlock: 82401236,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x5730Ba155FD95903c2706f1B2F8DBbBFB5e0a94c',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'withdrawals',
    input: {
      fromBlock: 5220484,
      toBlock: 5222484,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x4859ac3c9aC0A9c35Dc807f79B78f7b9a6F4e7E4',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Optimism,
    method: 'withdrawals',
    input: {
      fromBlock: 121055758,
      toBlock: 121057758,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x63289886Ad4Eb9364669741650cde780C9f2E7D2',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Polygon,
    method: 'withdrawals',
    input: {
      fromBlock: 57849653,
      toBlock: 57851653,
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
      protocolTokenAddress: '0x1B197B90c86BF04D221D94F773e5C7984d6a1D4c',
      productId: 'moo-token',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0xAB28C317B34084f29d7623208b5F09C0Dd566a18',
    blockNumber: 15374682,
  },
]
