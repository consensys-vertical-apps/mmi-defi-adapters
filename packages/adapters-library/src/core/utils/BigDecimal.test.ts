import { beforeEach, describe, expect, it } from 'vitest'
import { BigDecimal } from './BigDecimal'

describe('BigDecimal', () => {
  describe('constructor & toString', () => {
    it('should create instance with default decimals', () => {
      const bd = new BigDecimal('123.456')
      expect(bd.toString()).toBe('123.456000000000000000')
    })

    it('should create instance with custom decimals', () => {
      const bd = new BigDecimal('123.456', 3)
      expect(bd.toString()).toBe('123.456')
    })

    it('should handle integers', () => {
      const bd = new BigDecimal(123)
      expect(bd.toString()).toBe('123.000000000000000000')
    })

    it('should handle negative numbers', () => {
      const bd = new BigDecimal('-123.456')
      expect(bd.toString()).toBe('-123.456000000000000000')
    })
  })

  describe('fromBigInt', () => {
    it('should create instance from bigint', () => {
      const bd = BigDecimal.fromBigInt(BigInt('123456'))
      expect(bd.toString()).toBe('123456.000000000000000000')
    })

    it('should create instance from bigint', () => {
      const bd = BigDecimal.fromBigInt(123456n)
      expect(bd.toString()).toBe('123456.000000000000000000')
    })

    it('should handle negative bigint', () => {
      const bd = BigDecimal.fromBigInt(BigInt('-123456'))
      expect(bd.toString()).toBe('-123456.000000000000000000')
    })
  })

  describe('arithmetic operations', () => {
    let bd1: BigDecimal
    let bd2: BigDecimal

    beforeEach(() => {
      bd1 = new BigDecimal('10.5')
      bd2 = new BigDecimal('2.3')
    })

    describe('add', () => {
      it('should add two BigDecimals', () => {
        expect(bd1.add(bd2).toString()).toBe('12.800000000000000000')
      })

      it('should handle negative numbers', () => {
        const negative = new BigDecimal('-2.3')
        expect(bd1.add(negative).toString()).toBe('8.200000000000000000')
      })

      it('should handle different decimals', () => {
        const bd3 = new BigDecimal('10.5', 3)
        const bd4 = new BigDecimal('2.3', 2)
        expect(bd3.add(bd4).toString()).toBe('12.800')
      })

      it('should handle different decimals (2)', () => {
        const bd3 = new BigDecimal('10.5', 2)
        const bd4 = new BigDecimal('2.3', 3)
        expect(bd3.add(bd4).toString()).toBe('12.800')
      })
    })

    describe('subtract', () => {
      it('should subtract two BigDecimals', () => {
        expect(bd1.subtract(bd2).toString()).toBe('8.200000000000000000')
      })

      it('should handle negative results', () => {
        expect(bd2.subtract(bd1).toString()).toBe('-8.200000000000000000')
      })

      it('should handle different decimals', () => {
        const bd3 = new BigDecimal('10.5', 3)
        const bd4 = new BigDecimal('2.3', 2)
        expect(bd3.subtract(bd4).toString()).toBe('8.200')
      })

      it('should handle different decimals (2)', () => {
        const bd3 = new BigDecimal('10.5', 2)
        const bd4 = new BigDecimal('2.3', 3)
        expect(bd3.subtract(bd4).toString()).toBe('8.200')
      })
    })

    describe('multiply', () => {
      it('should multiply two BigDecimals', () => {
        expect(bd1.multiply(bd2).toString()).toBe('24.150000000000000000')
      })

      it('should handle multiplication by zero', () => {
        const zero = new BigDecimal('0')
        expect(bd1.multiply(zero).toString()).toBe('0.000000000000000000')
      })

      it('should handle negative numbers', () => {
        const negative = new BigDecimal('-2.3')
        expect(bd1.multiply(negative).toString()).toBe('-24.150000000000000000')
      })

      it('should handle different decimals', () => {
        const bd3 = new BigDecimal('10.5', 3)
        const bd4 = new BigDecimal('2.3', 2)
        expect(bd3.multiply(bd4).toString()).toBe('24.150')
      })

      it('should handle different decimals (2)', () => {
        const bd3 = new BigDecimal('10.5', 2)
        const bd4 = new BigDecimal('2.3', 3)
        expect(bd3.multiply(bd4).toString()).toBe('24.150')
      })
    })

    describe('divide', () => {
      it('should divide two BigDecimals', () => {
        expect(bd1.divide(bd2).toString()).toBe('4.565217391304347826')
      })

      it('should handle division of zero', () => {
        const zero = new BigDecimal('0')
        expect(zero.divide(bd1).toString()).toBe('0.000000000000000000')
      })

      it('should handle negative numbers', () => {
        const negative = new BigDecimal('-2.3')
        expect(bd1.divide(negative).toString()).toBe('-4.565217391304347826')
      })

      it('should throw when dividing by zero', () => {
        const zero = new BigDecimal('0')
        expect(() => bd1.divide(zero)).toThrow()
      })

      it('should handle different decimals', () => {
        const bd3 = new BigDecimal('10.5', 2)
        const bd4 = new BigDecimal('2.3', 3)
        expect(bd3.divide(bd4).toString()).toBe('4.565')
      })

      it('should handle different decimals (2)', () => {
        const bd3 = new BigDecimal('10.5', 3)
        const bd4 = new BigDecimal('2.3', 2)
        expect(bd3.divide(bd4).toString()).toBe('4.565')
      })
    })

    describe('sqrt', () => {
      it('should calculate square root', () => {
        const bd = new BigDecimal('100')
        expect(bd.sqrt().toString()).toBe('10.000000000000000000')
      })

      it('should calculate square root', () => {
        const bd = new BigDecimal('612215.4954944949')
        expect(bd.sqrt().toString()).toBe('782.442007751689479802')
      })

      it('should calculate square root (2)', () => {
        const bd = new BigDecimal(
          '291473102639493918970613087983.272171596191834415',
        )
        expect(bd.sqrt().toString()).toBe('539882489658160.629411929003938638')
      })

      it('should yield a number that, when multiplied by itself, yields the original number', () => {
        const original = '684687486483454128848448578.87785759488484'
        const bd = new BigDecimal(original)
        const sqrt = bd.sqrt()
        const squared = sqrt.multiply(sqrt)
        const diff = squared.subtract(bd)
        expect(Number(diff)).toBeCloseTo(0)
      })

      it('should throw error if trying to calculate square root of negative number', () => {
        const bd = new BigDecimal('-100')
        expect(() => bd.sqrt()).toThrow()
      })

      it('should handle zero', () => {
        const bd = new BigDecimal('0')
        expect(bd.sqrt().toString()).toBe('0.000000000000000000')
      })
    })
  })
})
