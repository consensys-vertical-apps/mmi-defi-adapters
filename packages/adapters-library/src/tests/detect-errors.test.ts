import { TimePeriod } from '../core/constants/timePeriod'
import { DefiProvider } from '../defiProvider'
import { DefiPositionResponse, DefiProfitsResponse } from '../types/response'

describe('detect errors', () => {
  it.each([{ enableFailover: false }, { enableFailover: true }])(
    'does not return any adapter error with positions %s',
    async (config) => {
      const defiProvider = new DefiProvider(config)
      const response = await defiProvider.getPositions({
        userAddress: '0x6372baD16935878713e5e1DD92EC3f7A3C48107E',
      })

      expect(filterErrors(response)).toEqual([])
    },
    60000,
  )

  it('does not return any adapter error with profits %s', async () => {
    const defiProvider = new DefiProvider()
    const response = await defiProvider.getProfits({
      userAddress: '0x6372baD16935878713e5e1DD92EC3f7A3C48107E',
      timePeriod: TimePeriod.oneDay,
    })

    expect(filterErrors(response)).toEqual([])
  }, 60000)
})

function filterErrors(
  response: DefiPositionResponse[] | DefiProfitsResponse[],
) {
  return response.filter(
    (responseEntry) =>
      !responseEntry.success &&
      ![
        'NotApplicableError',
        'NotImplementedError',
        'NotSupportedError',
        'ProtocolTokenFilterRequiredError',
        'NotSupportedUnlimitedGetLogsBlockRange',
      ].includes(responseEntry.error.details?.name),
  )
}
