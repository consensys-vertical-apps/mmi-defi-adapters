export function aprToApy(apr: number, compound: number): number {
  return (1 + apr / compound) ** compound - 1
}
