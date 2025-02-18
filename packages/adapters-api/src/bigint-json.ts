declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}

// biome-ignore lint/style/useExportType: Global declaration with a side effect
export {}
