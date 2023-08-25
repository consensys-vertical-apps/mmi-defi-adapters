import { TradeEvent } from '../../types/adapter'

export function aggregateTrades(events: TradeEvent[]): Record<string, bigint> {
  return events.reduce(
    (acc, event) => {
      return Object.entries(event.trades).reduce(
        (innerAcc, [address, number]) => {
          innerAcc[address] = (innerAcc[address] || BigInt(0)) + BigInt(number)
          return innerAcc
        },
        acc,
      )
    },
    {} as Record<string, bigint>,
  )
}
