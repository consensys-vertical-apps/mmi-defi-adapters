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

export const staticChainDataV2: Partial<
  Record<
    Chain,
    {
      poolAddresses: {
        poolNativeAddress?: string
        poolUsdcAddress?: string
        poolUsdtAddress?: string
        poolMetisAddress?: string
        poolMethAddress?: string
      }
      stargateStakingAddress: string
    }
  >
> = {
  [Chain.Ethereum]: {
    poolAddresses: {
      poolNativeAddress: getAddress(
        '0x77b2043768d28E9C9aB44E1aBfC95944bcE57931',
      ),
      poolUsdcAddress: getAddress('0xc026395860Db2d07ee33e05fE50ed7bD583189C7'),
      poolUsdtAddress: getAddress('0x933597a323Eb81cAe705C5bC29985172fd5A3973'),
      poolMetisAddress: getAddress(
        '0xcDafB1b2dB43f366E48e6F614b8DCCBFeeFEEcD3',
      ),
      poolMethAddress: getAddress('0x268Ca24DAefF1FaC2ed883c598200CcbB79E931D'),
    },
    stargateStakingAddress: getAddress(
      '0xFF551fEDdbeDC0AeE764139cCD9Cb644Bb04A6BD',
    ),
  },
  [Chain.Optimism]: {
    poolAddresses: {
      poolNativeAddress: getAddress(
        '0xe8CDF27AcD73a434D661C84887215F7598e7d0d3',
      ),
      poolUsdcAddress: getAddress('0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0'),
      poolUsdtAddress: getAddress('0x19cFCE47eD54a88614648DC3f19A5980097007dD'),
    },
    stargateStakingAddress: getAddress(
      '0xFBb5A71025BEf1A8166C9BCb904a120AA17d6443',
    ),
  },
  [Chain.Bsc]: {
    poolAddresses: {
      poolUsdcAddress: getAddress('0x962Bd449E630b0d928f308Ce63f1A21F02576057'),
      poolUsdtAddress: getAddress('0x138EB30f73BC423c6455C53df6D89CB01d9eBc63'),
    },
    stargateStakingAddress: getAddress(
      '0x26727C78B0209d9E787b2f9ac8f0238B122a3098',
    ),
  },
  [Chain.Polygon]: {
    poolAddresses: {
      poolUsdcAddress: getAddress('0x9Aa02D4Fae7F58b8E8f34c66E756cC734DAc7fe4'),
      poolUsdtAddress: getAddress('0xd47b03ee6d86Cf251ee7860FB2ACf9f91B9fD4d7'),
    },
    stargateStakingAddress: getAddress(
      '0x4694900bDbA99Edf07A2E46C4093f88F9106a90D',
    ),
  },
  [Chain.Base]: {
    poolAddresses: {
      poolNativeAddress: getAddress(
        '0xdc181Bd607330aeeBEF6ea62e03e5e1Fb4B6F7C7',
      ),
      poolUsdcAddress: getAddress('0x27a16dc786820B16E5c9028b75B99F6f604b5d26'),
    },
    stargateStakingAddress: getAddress(
      '0xDFc47DCeF7e8f9Ab19a1b8Af3eeCF000C7ea0B80',
    ),
  },
  [Chain.Arbitrum]: {
    poolAddresses: {
      poolNativeAddress: getAddress(
        '0xA45B5130f36CDcA45667738e2a258AB09f4A5f7F',
      ),
      poolUsdcAddress: getAddress('0xe8CDF27AcD73a434D661C84887215F7598e7d0d3'),
      poolUsdtAddress: getAddress('0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0'),
    },
    stargateStakingAddress: getAddress(
      '0x3da4f8E456AC648c489c286B99Ca37B666be7C4C',
    ),
  },
  [Chain.Avalanche]: {
    poolAddresses: {
      poolUsdcAddress: getAddress('0x5634c4a5FEd09819E3c46D86A965Dd9447d86e47'),
      poolUsdtAddress: getAddress('0x12dC9256Acc9895B076f6638D628382881e62CeE'),
    },
    stargateStakingAddress: getAddress(
      '0x8db623d439C8c4DFA1Ca94E4CD3eB8B3Aaff8331',
    ),
  },
  [Chain.Linea]: {
    poolAddresses: {
      poolNativeAddress: getAddress(
        '0x81F6138153d473E8c5EcebD3DC8Cd4903506B075',
      ),
    },
    stargateStakingAddress: getAddress(
      '0x25BBf59ef9246Dc65bFac8385D55C5e524A7B9eA',
    ),
  },
  [Chain.Sei]: {
    poolAddresses: {
      poolUsdcAddress: getAddress('0x45d417612e177672958dC0537C45a8f8d754Ac2E'),
      poolUsdtAddress: getAddress('0x0dB9afb4C33be43a0a0e396Fd1383B4ea97aB10a'),
    },
    stargateStakingAddress: getAddress(
      '0x8c1014B5936dD88BAA5F4DB0423C3003615E03a0',
    ),
  },
}

/**
 * On some chains, it appears they had two visions of V1 farm
 */
export const staticChainDataDepreciated: Partial<
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
  [Chain.Arbitrum]: {
    factoryAddress: getAddress('0x55bDb4164D28FBaF0898e0eF14a589ac09Ac9970'), // this might be wrong
    lpStakingAddress: getAddress('0xea8dfee1898a7e0a59f7527f076106d7e44c2176'),
    lpStakingType: 'LpStaking',
  },
}
