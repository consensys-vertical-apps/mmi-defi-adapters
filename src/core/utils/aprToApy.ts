export function aprToApy(apr: number, compoundingsPerYear: number): number {
  return Math.pow(1 + apr / compoundingsPerYear, compoundingsPerYear) - 1
}
