import { describe, expect, it } from 'vitest'
import { EvmChain } from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'
import { DefiPositionDetection } from '../tokenFilter'
import { DefiPositionResponse } from '../types/response'

describe('detect errors', () => {
  it.each([{ enableFailover: false }, { enableFailover: true }])(
    'does not return any adapter error with positions %s',
    async (config) => {
      const poolFilter: DefiPositionDetection = (
        _userAddress: string,
        chainId: EvmChain,
      ) => {
        // I got this users pools by calling https://defiadapters.api.cx.metamask.io/user-pools/0x6372baD16935878713e5e1DD92EC3f7A3C48107E
        const userPools = {
          '1': [
            '0x06C055753e37356b463813a288B2b0931B024dD4',
            '0x28cE264D0938C1051687FEbDCeFacc2242BA9E0E',
            '0x35fA164735182de50811E8e2E824cFb9B6118ac2',
            '0x695e502eE8e39A128FB79e8D01230d15f368eA45',
            '0x7786729eEe8b9d30fE7d91fDFf23A0f1D0C615D9',
            '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
            '0x86B5780b606940Eb59A062aA85a07959518c0161',
            '0x8CcAeC55FeE95e7edb6CF334182999c611B36db6',
            '0x90455bd11Ce8a67C57d467e634Dc142b8e4105Aa',
            '0x917ceE801a67f933F2e6b33fC0cD1ED2d5909D88',
            '0xAC0047886a985071476a1186bE89222659970d65',
            '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
            '0xB2dBc10F4fa6113ac75eEA254806F6a2AA4Bf20B',
            '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
            '0xD66b560f4e3e85f22C192d91dA847886d5C5Fd00',
            '0xF32e58F92e60f4b0A37A69b95d642A471365EAe8',
            '0xf951E335afb289353dc249e82926178EaC7DEd78',
            '0xfb35Fd0095dD1096b1Ca49AD44d8C5812A201677',
          ],
          '10': [
            '0x061b87122Ed14b9526A813209C8a59a633257bAb',
            '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
            '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
            '0x6ab707Aca953eDAeFBc4fD23bA73294241490620',
            '0x929EC64c34a17401F460460D4B9390518E5B473e',
            '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
            '0xd22363e3762cA7339569F3d33EADe20127D5F98C',
            '0xDecC0c09c3B5f6e92EF4184125D5648a66E35298',
            '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
            '0xFCCf3cAbbe80101232d343252614b6A3eE81C989',
          ],
          '56': [],
          '137': [
            '0x0297e37f1873D2DAb4487Aa67cD56B58E2F27875',
            '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
            '0x6FF62bfb8c12109E8000935A6De54daD83a4f39f',
            '0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC',
            '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
            '0xCE186F6Cccb0c955445bb9d10C59caE488Fea559',
            '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
            '0xf329e36C7bF6E5E86ce2150875a84Ce77f477375',
          ],
          '250': [],
          '1329': [],
          '8453': ['0x22Cf19B7D8DE1B53BbD9792e12eA86191985731F'],
          '42161': [
            '0x0C1Cf6883efA1B496B01f654E247B9b419873054',
            '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
            '0x64541216bAFFFEec8ea535BB71Fbc927831d0595',
            '0x892785f33CdeE22A30AEF750F285E18c18040c3e',
            '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2',
            '0x8f93Eaae544e8f5EB077A1e09C1554067d9e2CA8',
            '0xB7E50106A5bd3Cf21AF210A755F9C8740890A8c9',
            '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
            '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
            '0xFB5e6d0c1DfeD2BA000fBC040Ab8DF3615AC329c',
          ],
          '43114': [],
          '59144': [
            '0x1Bf74C010E6320bab11e2e5A532b5AC15e0b8aA6',
            '0xAad094F6A75A14417d39f04E690fC216f080A41a',
          ],
        }

        return Promise.resolve({
          contractAddresses: userPools[chainId] || [],
        })
      }

      const defiProvider = new DefiProvider({
        config,
        defiPositionDetection: poolFilter,
      })
      const response = await defiProvider.getPositions({
        userAddress: '0x6372baD16935878713e5e1DD92EC3f7A3C48107E',
      })

      expect(filterErrors(response)).toEqual([])
    },
    60000,
  )

  it('fetches protocol details and checks iconUrl is valid %s', async () => {
    const defiProvider = new DefiProvider()
    const protocolDetails = await defiProvider.getSupport({
      includeProtocolTokens: false,
    })

    const invalidProtocols = Object.values(protocolDetails)
      .flat()
      .filter((protocol) => {
        return !protocol.protocolDetails.iconUrl || !/^https?:\/\/.+/.test(protocol.protocolDetails.iconUrl)
      })

    if (invalidProtocols.length > 0) {
      console.error(
        'Protocols with invalid iconUrl:',
        invalidProtocols.map((p) => p.protocolDetails.name),
      )
    }

    expect(invalidProtocols).toEqual([])
  })
})

function filterErrors(response: DefiPositionResponse[]) {
  return response.filter(
    (responseEntry) =>
      !responseEntry.success &&
      ![
        'NotImplementedError',
        'NotSupportedError',
        'ProtocolTokenFilterRequiredError',
        'NotSupportedUnlimitedGetLogsBlockRange',
      ].includes(responseEntry.error.details?.name),
  )
}
