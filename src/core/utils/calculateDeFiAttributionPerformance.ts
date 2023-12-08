export function calculateDeFiAttributionPerformance({
  profit,
  withdrawal,
  deposit,
  startPositionValue,
}: {
  profit: number
  withdrawal: number
  deposit: number
  startPositionValue: number
}) {
  const denominator = startPositionValue - withdrawal + deposit

  if (!denominator) return 0

  return +profit / denominator
}
