import { BaseApyCalculator } from './BaseApyCalculator'

describe('BaseApyCalculator', () => {
  let calculator: BaseApyCalculator

  beforeEach(() => {
    class MockApyCalculator extends BaseApyCalculator {
      computeInterest() {
        return 0.005
      }
    }
    calculator = new MockApyCalculator()
  })

  describe('computeApr', () => {
    it('computes correctly', () => {
      const interest = 0.005
      const frequency = 12 // Period of 1 month
      expect(calculator.computeApr(interest, frequency)).toBeCloseTo(0.06, 10)
    })
  })

  describe('computeApy', () => {
    it('computes correctly', () => {
      const apr = 0.06
      const frequency = 12 // Period of 1 month
      expect(calculator.computeApy(apr, frequency)).toBeCloseTo(0.0618, 3)
    })

    it('throws when dividing by zero', () => {
      expect(() => calculator.computeApy(0.05, 0)).toThrow()
    })
  })
})
