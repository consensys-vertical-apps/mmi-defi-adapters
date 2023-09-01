import { BytesLike, providers } from 'ethers'
import { Multicall } from '../../contracts/Multicall'
import { logger } from './logger'

interface PendingCall {
  callParams: { target: string; callData: BytesLike; allowFailure: boolean }
  resolve: (value: string) => void
  reject: (reason: string | undefined) => void
}

export class MulticallQueue {
  private pendingCalls: PendingCall[] = []
  private multicallContract: Multicall
  private flushTimeoutMs: number

  private maxBatchSize: number
  private _timer: NodeJS.Timeout | null = null

  constructor({
    flushTimeoutMs,
    maxBatchSize,
    multicallContract,
  }: {
    flushTimeoutMs: number
    maxBatchSize: number
    multicallContract: Multicall
  }) {
    this.flushTimeoutMs = flushTimeoutMs
    this.maxBatchSize = maxBatchSize
    this.multicallContract = multicallContract
  }

  private set timer(value: NodeJS.Timeout | null) {
    if (this._timer) clearTimeout(this._timer)
    this._timer = value
  }

  private get timer() {
    return this._timer
  }

  async queueCall(callParams: providers.TransactionRequest): Promise<string> {
    const { to, data, from } = callParams

    if (from) {
      logger.error(
        'MulticallQueue unable to handle from parameter, use standard json rpc provider instead',
      )
      throw new Error(
        'MulticallQueue unable to handle from parameter, use standard json rpc provider instead',
      )
    }

    if (!to || !data) {
      logger.error('To and Data are required when using MulticallQueue')
      throw new Error('To and Data are required when using MulticallQueue')
    }

    return new Promise((resolve, reject) => {
      this.pendingCalls.push({
        callParams: { target: to, callData: data, allowFailure: true },
        resolve,
        reject,
      })

      if (this.pendingCalls.length >= this.maxBatchSize) {
        this._flush()
      } else if (!this.timer) {
        this.timer = setTimeout(() => {
          this._flush()
          this.timer = null
        }, this.flushTimeoutMs)
      }
    })
  }

  private async _flush() {
    const callsToProcess = [...this.pendingCalls]
    this.pendingCalls = []

    const batchSize = callsToProcess.length
    logger.info({ batchSize }, 'Sending multicall batch ')

    const results = await this.multicallContract.callStatic.aggregate3(
      callsToProcess.map(({ callParams }) => callParams),
    )

    const resultLength = results.length
    const callsToProcessLength = callsToProcess.length

    if (resultLength !== callsToProcessLength) {
      // reject all to be on safe side
      callsToProcess.forEach(({ reject }) => {
        reject('Multicall batch failed')
      })

      logger.error(
        {
          resultLength,
          callsToProcessLength,
        },
        'Multicall response length differs from batch sent',
      )
      return
    }

    callsToProcess.forEach(({ resolve, reject }, i) => {
      const result = results[i]
      if (!result) return

      const { returnData, success } = result

      if (!success) {
        logger.error(returnData, 'A request inside a multicall batch failed')
        reject(returnData)
      } else {
        resolve(returnData)
      }
    })
  }
}
