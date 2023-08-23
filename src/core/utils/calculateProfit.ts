export function calculateProfit(
  deposits: Record<string, number | undefined> | undefined,
  withdrawals: Record<string, number | undefined> | undefined,
  currentValues: Record<string, number | undefined> | undefined,
  previousVales: Record<string, number | undefined> | undefined,
): Record<string, number> {
  return Object.keys({
    ...deposits,
    ...withdrawals,
    ...currentValues,
    ...previousVales,
  }).reduce(
    (acc, address) => {
      acc[address] =
        (currentValues?.[address] || 0) +
        (withdrawals?.[address] || 0) -
        (deposits?.[address] || 0) -
        (previousVales?.[address] || 0)
      return acc
    },
    {} as Record<string, number>,
  )
}
