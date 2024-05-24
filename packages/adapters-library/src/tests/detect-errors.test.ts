import { DefiProvider } from '../defiProvider'
import { DefiPositionResponse, DefiProfitsResponse } from '../types/response'

describe('detect errors', () => {
  it('does not return any adapter error with positions', async () => {
    const defiProvider = new DefiProvider()
    const response = await defiProvider.getPositions({
      userAddress: '0xaa62cf7caaf0c7e50deaa9d5d0b907472f00b258',
    })

    expect(filterErrors(response)).toEqual([])
  }, 60000)

  it('does not return any adapter error with profits', async () => {
    const defiProvider = new DefiProvider()
    const response = await defiProvider.getProfits({
      userAddress: '0xaa62cf7caaf0c7e50deaa9d5d0b907472f00b258',
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
      !['NotApplicableError', 'NotImplementedError', 'NotSupportedError'].includes(
        responseEntry.error.details?.name,
      ),
  )
}
