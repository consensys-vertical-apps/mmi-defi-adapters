import { MovementsByBlock } from '../../types/adapter'

export function aggregateTrades(
  events: MovementsByBlock[],
): Record<string, number> {
  return events.reduce(
    (acc, event) => {
      return Object.entries(event.movements).reduce(
        (innerAcc, [address, number]) => {
          innerAcc[address] = (innerAcc[address] || 0) + number
          return innerAcc
        },
        acc,
      )
    },
    {} as Record<string, number>,
  )
}
