import { getAddress } from 'ethers'
import { Chain } from '../../../core/constants/chains'

export const staticChainData: Partial<
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
}
