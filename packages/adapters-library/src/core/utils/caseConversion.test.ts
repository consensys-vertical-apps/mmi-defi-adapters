import { describe, expect, it } from 'vitest'
import { isKebabCase, isPascalCase, pascalCase } from './caseConversion'

describe('caseConversion', () => {
  describe('pascalCase', () => {
    it.each([
      ['camelCase', 'CamelCase'],
      ['kebab-case', 'KebabCase'],
      ['Wrong-Case', 'WrongCase'],
    ])('converts %s to PascalCase %s', async (value, expected) => {
      const result = pascalCase(value)

      expect(result).toEqual(expected)
    })
  })

  describe('isPascalCase', () => {
    it.each([['PascalCase', 'UPPERCASE']])(
      'identifies PascalCase strings: %s',
      async (value) => {
        const result = isPascalCase(value)

        expect(result).toEqual(true)
      },
    )

    it.each([['camelCase'], ['kebab-case'], ['Wrong-Case']])(
      'identifies non-PascalCase strings: %s',
      async (value) => {
        const result = isPascalCase(value)

        expect(result).toEqual(false)
      },
    )
  })

  describe('isKebabCase', () => {
    it.each([['kebab-case']])(
      'identifies PascalCase strings: %s',
      async (value) => {
        const result = isKebabCase(value)

        expect(result).toEqual(true)
      },
    )

    it.each([['PascalCase'], ['UPPERCASE'], ['camelCase'], ['Wrong-Case']])(
      'identifies non-PascalCase strings: %s',
      async (value) => {
        const result = isKebabCase(value)

        expect(result).toEqual(false)
      },
    )
  })
})
