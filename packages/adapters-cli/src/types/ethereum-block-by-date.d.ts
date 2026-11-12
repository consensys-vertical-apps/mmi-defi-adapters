declare module 'ethereum-block-by-date' {
  /**
   * Minimal typings for ethereum-block-by-date (avoids @types package that pulls web3).
   */
  export default class EthDater {
    constructor(provider: unknown)
    /**
     * Resolve the nearest block for a unix timestamp in milliseconds.
     */
    getDate(
      date: string | number | Date,
      after?: boolean,
      refresh?: boolean,
    ): Promise<{ date: string; block: number; timestamp: number }>
    getEvery(
      period: string,
      start: string,
      end: string,
      duration: number,
      ascending: boolean,
    ): Promise<{ block: number; date: string }[]>
  }
}
