import { describe, expect, it } from 'vitest'
import { EvmChain } from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'
import { PoolFilter } from '../tokenFilter'
import { DefiPositionResponse } from '../types/response'

describe('detect errors', () => {
  it.each([{ enableFailover: false }, { enableFailover: true }])(
    'does not return any adapter error with positions %s',
    async (config) => {
      const defiProvider = new DefiProvider({ config })
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
        return !/^https?:\/\/.+/.test(protocol.protocolDetails.iconUrl)
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
