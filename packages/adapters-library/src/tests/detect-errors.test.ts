import { Chain } from '../core/constants/chains.js'
import { DefiProvider } from '../defiProvider.js'
import type { DefiPositionResponse } from '../types/response.js'

describe('detect errors', () => {
  it.each([{ enableFailover: false }, { enableFailover: true }])(
    'does not return any adapter error with positions %s',
    async (config) => {
      const defiProvider = new DefiProvider({ config })
      const response = await defiProvider.getPositions({
        userAddress: '0x6372baD16935878713e5e1DD92EC3f7A3C48107E',
        // TODO: Remove this filter when BSC is fully reliable
        filterChainIds: Object.values(Chain).filter(
          (chainId) => chainId !== Chain.Bsc,
        ),
      })

      expect(filterErrors(response)).toEqual([])
    },
    60000,
  )
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
