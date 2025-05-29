import { describe, expect, it } from 'vitest'
import { extractErrorMessage } from './extractErrorMessage'

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

  it('stringifies error if it is not an instance of Error or a string', async () => {
    const error = 25n

    const result = extractErrorMessage(error)

    expect(result).toEqual('25')
  })
})
