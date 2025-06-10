export function createWatchKey(
  contractAddress: string,
  topic0: string,
): string {
  return `${contractAddress.toLowerCase()}#${topic0.toLowerCase()}`
}
