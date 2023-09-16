import { MovementsByBlock } from '../../types/adapter.js'

export function aggregateTrades(
  events: MovementsByBlock[],
): Record<string, bigint> {
  return events.reduce(
    (acc, event) => {
      return Object.entries(event.underlyingTokensMovement).reduce(
        (innerAcc, [address, { movementValueRaw: valueRaw }]) => {
          innerAcc[address] =
            (innerAcc[address] ?? BigInt(0)) + BigInt(valueRaw)
          return innerAcc
        },
        acc,
      )
    },
    {} as Record<string, bigint>,
  )
}
