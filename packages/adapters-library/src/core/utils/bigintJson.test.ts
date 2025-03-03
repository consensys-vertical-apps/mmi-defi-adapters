import { bigintJsonParse, bigintJsonStringify } from './bigintJson.js'

describe('bigintJson', () => {
  describe('bigintJsonParse', () => {
    it('parses bigint within stored as a string', async () => {
      const jsonString =
        '{ "field1": "1", "field2": 2, "field3": "3n", "field4": "-4n" }'

      const result = bigintJsonParse(jsonString)

      expect(result).toEqual({
        field1: '1',
        field2: 2,
        field3: 3n,
        field4: -4n,
      })
    })
  })

  describe('bigintJsonStringify', () => {
    it('stringifies bigint with a bigint', async () => {
      const jsonData = {
        field1: '1',
        field2: 2,
        field3: 3n,
        field4: -4n,
      }

      const result = bigintJsonStringify(jsonData)

      expect(result).toEqual(
        '{"field1":"1","field2":2,"field3":"3n","field4":"-4n"}',
      )
    })
  })
})
