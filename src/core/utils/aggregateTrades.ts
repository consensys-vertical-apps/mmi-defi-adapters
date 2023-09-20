import { MovementsByBlock } from '../../types/adapter'

export function aggregateTrades(
  events: MovementsByBlock[],
): Record<string, bigint> {
  return events.reduce(
    (acc, event) => {
      return Object.entries(event.underlyingTokensMovement).reduce(
        (innerAcc, [address, { movementValueRaw: valueRaw }]) => {
          innerAcc[address] = (innerAcc[address] ?? 0n) + valueRaw
          return innerAcc
        },
        acc,
      )
    },
    {} as Record<string, bigint>,
  )
}
