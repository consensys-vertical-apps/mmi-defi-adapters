import { DefiProvider } from '../defiProvider'

describe('detect errors', () => {
  it('does not return any adapter errors', async () => {
    const defiProvider = new DefiProvider()
    const positionsResponse = await defiProvider.getPositions({
      userAddress: '0xaa62cf7caaf0c7e50deaa9d5d0b907472f00b258',
    })

    const positionsWithErrors = positionsResponse.filter(
      (position) =>
        !position.success &&
        !['NotApplicableError', 'NotImplementedError'].includes(
          position.error.details?.name,
        ),
    )

    expect(positionsWithErrors).toEqual([])
    expect(true).toBeFalsy()
  }, 60000)
})
