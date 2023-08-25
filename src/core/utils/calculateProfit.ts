import { BaseToken } from '../../types/adapter'

export function calculateProfit({
  deposits,
  withdrawals,
  currentValues,
  previousVales,
}: {
  deposits: Record<string, bigint>
  withdrawals: Record<string, bigint>
  currentValues: Record<string, BaseToken>
  previousVales: Record<string, BaseToken>
}): Record<string, bigint> {
  return Object.keys({
    ...deposits,
    ...withdrawals,
    ...currentValues,
    ...previousVales,
  }).reduce(
    (accumulator, address) => {
      const currentValue = currentValues[address]?.balanceRaw ?? BigInt(0)
      const withdrawalsValue = withdrawals[address] ?? BigInt(0)
      const depositsValue = deposits[address] ?? BigInt(0)
      const previousValue = previousVales[address]?.balanceRaw ?? BigInt(0)

      accumulator[address] =
        currentValue + withdrawalsValue - depositsValue - previousValue

      return accumulator
    },
    {} as Record<string, bigint>,
  )
}
