import { BaseToken } from '../../types/adapter'

export function calculateProfit(
  deposits: Record<string, number | undefined>,
  withdrawals: Record<string, number | undefined>,
  currentValues: Record<string, BaseToken | undefined>,
  previousVales: Record<string, BaseToken | undefined>,
): Record<string, bigint> {
  return Object.keys({
    ...deposits,
    ...withdrawals,
    ...currentValues,
    ...previousVales,
  }).reduce(
    (acc, address) => {
      const currentValue = currentValues[address]?.balanceRaw || BigInt(0)
      const withdrawalsValue = withdrawals[address]
        ? BigInt(withdrawals[address]!)
        : BigInt(0)
      const depositsValue = deposits[address]
        ? BigInt(deposits[address]!)
        : BigInt(0)
      const previousValue = previousVales[address]?.balanceRaw || BigInt(0)

      acc[address] =
        currentValue + withdrawalsValue - depositsValue - previousValue

      return acc
    },
    {} as Record<string, bigint>,
  )
}
