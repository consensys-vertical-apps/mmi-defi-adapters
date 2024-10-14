import { computeApr, computeApy } from './common'

describe('computeApr', () => {
  it('computes correctly', () => {
    const interest = 0.005
    const frequency = 12 // Period of 1 month
    expect(computeApr(interest, frequency)).toBeCloseTo(0.06, 10)
  })
})

describe('computeApy', () => {
  it('computes correctly', () => {
    const apr = 0.06
    const frequency = 12 // Period of 1 month
    expect(computeApy(apr, frequency)).toBeCloseTo(0.0618, 3)
  })

  it('throws when dividing by zero', () => {
    expect(() => computeApy(0.05, 0)).toThrow()
  })
})
