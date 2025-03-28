import { describe, expect, it } from 'vitest'
import { DefiProvider } from '../defiProvider'
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
