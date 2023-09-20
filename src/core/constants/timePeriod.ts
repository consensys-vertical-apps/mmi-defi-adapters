export const TimePeriod = {
  oneDay: 1,
  sevenDays: 7,
  thirtyDays: 30,
} as const
export type TimePeriod = (typeof TimePeriod)[keyof typeof TimePeriod]
