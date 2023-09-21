export function bigintJsonParse(text: string) {
  return JSON.parse(text, (_key, value) => {
    if (typeof value === 'string' && /^-?\d+n$/.test(value)) {
      return BigInt(value.substring(0, value.length - 1))
    }
    return value
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bigintJsonStringify(value: any, space?: number) {
  return JSON.stringify(
    value,
    (_, value) => (typeof value === 'bigint' ? `${value.toString()}n` : value),
    space,
  )
}
