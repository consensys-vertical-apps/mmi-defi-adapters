export function unixTimestampToDateString(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  const day = date.getUTCDate().toString().padStart(2, '0')
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}
