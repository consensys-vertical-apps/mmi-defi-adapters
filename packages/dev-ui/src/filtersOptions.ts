import {
  Chain,
  Protocol,
  TimePeriod,
} from '@metamask-institutional/defi-adapters'

export const protocolOptions = Object.entries(Protocol).map(
  ([label, value]) => ({
    value,
    label,
  }),
)

export const chainOptions = Object.entries(Chain).map(([label, value]) => ({
  value,
  label,
}))

export const timePeriodOptions = [
  { value: TimePeriod.oneDay, label: '1 Day' },
  { value: TimePeriod.sevenDays, label: '7 Days' },
  { value: TimePeriod.thirtyDays, label: '30 Days' },
]
