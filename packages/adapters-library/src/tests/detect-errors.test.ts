import { DefiProvider } from '../defiProvider'
import { DefiPositionResponse, DefiProfitsResponse } from '../types/response'

describe('detect errors', () => {
  it.each([
    { enableUsdPricesOnPositions: false, enableFailover: false },
    { enableUsdPricesOnPositions: false, enableFailover: true },
    { enableUsdPricesOnPositions: true, enableFailover: true },
  ])(
    'does not return any adapter error with positions',
    async (config) => {
      const defiProvider = new DefiProvider(config)
      const response = await defiProvider.getPositions({
        userAddress: '0xaa62cf7caaf0c7e50deaa9d5d0b907472f00b258',
      })

      expect(filterErrors(response)).toEqual([])
    },
    60000,
  )

  it.each([
    { enableUsdPricesOnPositions: false },
    { enableUsdPricesOnPositions: true },
  ])(
    'does not return any adapter error with profits',
    async (config) => {
      const defiProvider = new DefiProvider(config)
      const response = await defiProvider.getProfits({
        userAddress: '0xaa62cf7caaf0c7e50deaa9d5d0b907472f00b258',
      })

      expect(filterErrors(response)).toEqual([])
    },
    60000,
  )
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
      ].includes(responseEntry.error.details?.name),
  )
}
