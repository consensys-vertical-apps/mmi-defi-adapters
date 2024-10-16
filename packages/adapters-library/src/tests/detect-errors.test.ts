import { TimePeriod } from '../core/constants/timePeriod.js'
import { DefiProvider } from '../defiProvider.js'
import type {
  DefiPositionResponse,
  DefiProfitsResponse,
} from '../types/response.js'

describe('detect errors', () => {
  it.each([
    { enableUsdPricesOnPositions: false, enableFailover: false },
    { enableUsdPricesOnPositions: true, enableFailover: true },
  ])(
    'does not return any adapter error with positions %s',
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
    'does not return any adapter error with profits %s',
    async (config) => {
      const defiProvider = new DefiProvider(config)
      const response = await defiProvider.getProfits({
        userAddress: '0x117C99451cae094B3a7d56C9d3A97c96900b8e7A',
        timePeriod: TimePeriod.oneDay,
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
        'ProtocolTokenFilterRequiredError',
      ].includes(responseEntry.error.details?.name),
  )
}
