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
  })
})
