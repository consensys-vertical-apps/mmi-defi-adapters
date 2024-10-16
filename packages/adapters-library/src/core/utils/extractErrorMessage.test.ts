import { extractErrorMessage } from './extractErrorMessage.js'

describe('extractErrorMessage', () => {
  it('extracts message from Error instance', async () => {
    const errorMessage = 'Message from within Error'
    const error = new Error(errorMessage)

    const result = extractErrorMessage(error)

    expect(result).toEqual(errorMessage)
  })

  it('extracts message from a string', async () => {
    const errorMessage = 'String error message'

    const result = extractErrorMessage(errorMessage)

    expect(result).toEqual(errorMessage)
  })

  it('returns default message if error cannot be extracted', async () => {
    const error = 25n

    const result = extractErrorMessage(error)

    expect(result).toEqual('Cannot extract error message')
  })
})
