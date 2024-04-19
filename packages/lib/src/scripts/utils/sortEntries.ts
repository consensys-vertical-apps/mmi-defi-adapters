export function sortEntries<T>(
  entries: T[],
  extractIdentifier: (element: T) => string,
) {
  entries.sort((a, b) =>
    extractIdentifier(a).localeCompare(extractIdentifier(b)),
  )
}
