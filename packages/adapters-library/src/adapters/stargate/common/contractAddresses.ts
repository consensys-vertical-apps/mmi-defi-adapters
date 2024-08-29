import { getAddress } from 'ethers'
import { Chain } from '../../../core/constants/chains'

export const contractAddresses: Partial<
  Record<Chain, { factory: string; lpStaking: string; stargateToken: string }>
> = {
  [Chain.Ethereum]: {
    factory: getAddress('0x06D538690AF257Da524f25D0CD52fD85b1c2173E'),
    lpStaking: getAddress('0xB0D502E938ed5f4df2E681fE6E419ff29631d62b'),
    stargateToken: getAddress('0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6'),
  },
  [Chain.Optimism]: {
    factory: getAddress('0xE3B53AF74a4BF62Ae5511055290838050bf764Df'),
    lpStaking: getAddress('0x4DeA9e918c6289a52cd469cAC652727B7b412Cd2'), // LpStakingTime
    stargateToken: getAddress('0x296F55F8Fb28E498B858d0BcDA06D955B2Cb3f97'),
  },
  [Chain.Bsc]: {
    factory: getAddress('0xe7Ec689f432f29383f217e36e680B5C855051f25'),
    lpStaking: getAddress('0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47'),
    stargateToken: getAddress('0xB0D502E938ed5f4df2E681fE6E419ff29631d62b'),
  },
  [Chain.Polygon]: {
    factory: getAddress('0x808d7c71ad2ba3FA531b068a2417C63106BC0949'),
    lpStaking: getAddress('0x8731d54E9D02c286767d56ac03e8037C07e01e98'),
    stargateToken: getAddress('0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'),
  },
  [Chain.Fantom]: {
    factory: getAddress('0x9d1B1669c73b033DFe47ae5a0164Ab96df25B944'),
    lpStaking: getAddress('0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03'),
    stargateToken: getAddress('0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'),
  },
  [Chain.Base]: {
    factory: getAddress('0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6'),
    lpStaking: getAddress('0x06Eb48763f117c7Be887296CDcdfad2E4092739C'), // LpStakingTime
    stargateToken: getAddress('0xE3B53AF74a4BF62Ae5511055290838050bf764Df'),
  },
  [Chain.Arbitrum]: {
    factory: getAddress('0x55bDb4164D28FBaF0898e0eF14a589ac09Ac9970'),
    lpStaking: getAddress('0x9774558534036Ff2E236331546691b4eB70594b1'), // LpStakingTime
    stargateToken: getAddress('0x6694340fc020c5E6B96567843da2df01b2CE1eb6'),
  },
  [Chain.Avalanche]: {
    factory: getAddress('0x808d7c71ad2ba3FA531b068a2417C63106BC0949'),
    lpStaking: getAddress('0x8731d54E9D02c286767d56ac03e8037C07e01e98'),
    stargateToken: getAddress('0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'),
  },
  [Chain.Linea]: {
    factory: getAddress('0xaf54be5b6eec24d6bfacf1cce4eaf680a8239398'),
    lpStaking: getAddress('0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8'), // LpStakingTime
    stargateToken: getAddress('0x808d7c71ad2ba3FA531b068a2417C63106BC0949'),
  },
}
