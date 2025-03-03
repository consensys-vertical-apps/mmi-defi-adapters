import { collectLeafTokens } from './collectLeafTokens.js'

type Token = {
  name: string
  tokens?: Token[]
}

describe('collectLeafTokens', () => {
  it('should collect all leaf tokens when tokens array is populated', () => {
    const token: Token = {
      name: 'RootToken',
      tokens: [
        {
          name: 'MiddleToken1',
          tokens: [
            { name: 'LeafToken1', tokens: [] },
            { name: 'LeafToken2', tokens: [] },
          ],
        },
        { name: 'LeafToken3', tokens: [] },
      ],
    }

    const leaves = collectLeafTokens(token)

    expect(leaves).toEqual([
      { name: 'LeafToken1', tokens: [] },
      { name: 'LeafToken2', tokens: [] },
      { name: 'LeafToken3', tokens: [] },
    ])
  })

  it('should treat tokens with undefined underlying tokens as leaf tokens', () => {
    const token: Token = {
      name: 'RootToken',
      tokens: [
        {
          name: 'MiddleToken1',
          tokens: [
            { name: 'LeafToken1', tokens: undefined },
            { name: 'LeafToken2' }, // tokens undefined
          ],
        },
        { name: 'LeafToken3', tokens: [] },
        { name: 'LeafToken4' }, // tokens undefined
      ],
    }

    const leaves = collectLeafTokens(token)

    expect(leaves).toEqual([
      { name: 'LeafToken1', tokens: undefined },
      { name: 'LeafToken2' }, // treated as leaf
      { name: 'LeafToken3', tokens: [] },
      { name: 'LeafToken4' }, // treated as leaf
    ])
  })

  it('should return the original token when it has no tokens property (root is a leaf)', () => {
    const token: Token = { name: 'SingleLeafToken' }

    const leaves = collectLeafTokens(token)

    expect(leaves).toEqual([{ name: 'SingleLeafToken' }])
  })

  it('should return an empty array when the token has no tokens and is empty', () => {
    const token = { name: 'RootToken', tokens: [] }

    const leaves = collectLeafTokens(token)

    expect(leaves).toEqual([{ name: 'RootToken', tokens: [] }])
  })

  it('should handle deeply nested token structures', () => {
    const token: Token = {
      name: 'RootToken',
      tokens: [
        {
          name: 'MiddleToken1',
          tokens: [
            {
              name: 'NestedToken1',
              tokens: [
                { name: 'LeafToken1', tokens: [] },
                { name: 'LeafToken2', tokens: [] },
              ],
            },
          ],
        },
        { name: 'LeafToken3', tokens: [] },
      ],
    }

    const leaves = collectLeafTokens(token)

    expect(leaves).toEqual([
      { name: 'LeafToken1', tokens: [] },
      { name: 'LeafToken2', tokens: [] },
      { name: 'LeafToken3', tokens: [] },
    ])
  })
})
