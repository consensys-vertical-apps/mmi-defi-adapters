import { getAddress } from 'ethers'
import { Chain } from '../../../core/constants/chains'

export const staticChainData: Partial<
  Record<
    Chain,
    {
      factoryAddress: string
      lpStakingAddress: string
      lpStakingType: 'LpStaking' | 'LpStakingTime'
      lpStakingTimeMetisAddress?: string
    }
  >
> = {
  [Chain.Ethereum]: {
    factoryAddress: getAddress('0x06D538690AF257Da524f25D0CD52fD85b1c2173E'),
    lpStakingAddress: getAddress('0xB0D502E938ed5f4df2E681fE6E419ff29631d62b'),
    lpStakingType: 'LpStaking',
    lpStakingTimeMetisAddress: getAddress(
      '0x1c3000b8f475A958b87c73a5cc5780Ab763122FC',
    ),
  },
  [Chain.Optimism]: {
    factoryAddress: getAddress('0xE3B53AF74a4BF62Ae5511055290838050bf764Df'),
    lpStakingAddress: getAddress('0x4DeA9e918c6289a52cd469cAC652727B7b412Cd2'),
    lpStakingType: 'LpStakingTime',
  },
  [Chain.Bsc]: {
    factoryAddress: getAddress('0xe7Ec689f432f29383f217e36e680B5C855051f25'),
    lpStakingAddress: getAddress('0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47'),
    lpStakingType: 'LpStaking',
    lpStakingTimeMetisAddress: getAddress(
      '0x447f2078a1b6b2c1190b7b7af98ef4b139d41f70',
    ),
  },
  [Chain.Polygon]: {
    factoryAddress: getAddress('0x808d7c71ad2ba3FA531b068a2417C63106BC0949'),
    lpStakingAddress: getAddress('0x8731d54E9D02c286767d56ac03e8037C07e01e98'),
    lpStakingType: 'LpStaking',
  },
  [Chain.Fantom]: {
    factoryAddress: getAddress('0x9d1B1669c73b033DFe47ae5a0164Ab96df25B944'),
    lpStakingAddress: getAddress('0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03'),
    lpStakingType: 'LpStaking',
  },
  [Chain.Base]: {
    factoryAddress: getAddress('0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6'),
    lpStakingAddress: getAddress('0x06Eb48763f117c7Be887296CDcdfad2E4092739C'),
    lpStakingType: 'LpStakingTime',
  },
  [Chain.Arbitrum]: {
    factoryAddress: getAddress('0x55bDb4164D28FBaF0898e0eF14a589ac09Ac9970'),
    lpStakingAddress: getAddress('0x9774558534036Ff2E236331546691b4eB70594b1'),
    lpStakingType: 'LpStakingTime',
  },
  [Chain.Avalanche]: {
    factoryAddress: getAddress('0x808d7c71ad2ba3FA531b068a2417C63106BC0949'),
    lpStakingAddress: getAddress('0x8731d54E9D02c286767d56ac03e8037C07e01e98'),
    lpStakingType: 'LpStaking',
  },
  [Chain.Linea]: {
    factoryAddress: getAddress('0xaf54be5b6eec24d6bfacf1cce4eaf680a8239398'),
    lpStakingAddress: getAddress('0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8'),
    lpStakingType: 'LpStakingTime',
  },
}
