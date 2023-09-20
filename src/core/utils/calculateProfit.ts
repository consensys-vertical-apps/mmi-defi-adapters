import { BaseToken, PositionType } from '../../types/adapter'

export function calculateProfit({
  deposits,
  withdrawals,
  currentValues,
  previousVales,
  positionType,
}: {
  deposits: Record<string, bigint>
  withdrawals: Record<string, bigint>
  currentValues: Record<string, BaseToken>
  previousVales: Record<string, BaseToken>
  positionType: PositionType
}): Record<string, bigint> {
  return Object.keys({
    ...deposits,
    ...withdrawals,
    ...currentValues,
    ...previousVales,
  }).reduce(
    (accumulator, address) => {
      const currentValue = currentValues[address]?.balanceRaw ?? 0n
      const withdrawalsValue = withdrawals[address] ?? 0n
      const depositsValue = deposits[address] ?? 0n
      const previousValue = previousVales[address]?.balanceRaw ?? 0n

      accumulator[address] =
        currentValue + withdrawalsValue - depositsValue - previousValue

      if (positionType === PositionType.Borrow) {
        accumulator[address] *= -1n
      }

      return accumulator
    },
    {} as Record<string, bigint>,
  )
}
