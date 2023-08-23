import { TradeEvent } from '../../types/adapter'

export function aggregateTrades(events: TradeEvent[]): Record<string, number> {
  return events.reduce(
    (acc, event) => {
      return Object.entries(event.trades).reduce(
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
