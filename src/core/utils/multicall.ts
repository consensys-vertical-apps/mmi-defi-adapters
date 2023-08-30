import { providers } from 'ethers'
import { Multicall } from '../../contracts/Multicall'
import { logger } from './logger'

interface PendingCall {
  callParams: providers.TransactionRequest
  resolve: (value: any) => void
  reject: (reason: any) => void
}

export class MulticallQueue {
  private pendingCalls: PendingCall[] = []
  private multicallContract: Multicall
  private batchIntervalMs: number

  private requestThreshold: number
  private _timer: NodeJS.Timeout | null = null

  constructor({
    batchIntervalMs,
    maxBatchSize,
    multicallContract,
  }: {
    batchIntervalMs: number
    maxBatchSize: number
    multicallContract: Multicall
  }) {
    this.batchIntervalMs = batchIntervalMs
    this.requestThreshold = maxBatchSize
    this.multicallContract = multicallContract
  }

  private set timer(value: NodeJS.Timeout | null) {
    if (this._timer) clearTimeout(this._timer)
    this._timer = value
  }

  get timer() {
    return this._timer
  }

  async queueCall(callParams: providers.TransactionRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pendingCalls.push({
        callParams,
        resolve,
        reject,
      })

      if (this.pendingCalls.length >= this.requestThreshold) {
        this.flush()
      } else if (!this.timer) {
        this.timer = setTimeout(() => {
          this.flush()
          this.timer = null
        }, this.batchIntervalMs)
      }
    })
  }

  private async flush() {
    const callsToProcess = [...this.pendingCalls]
    this.pendingCalls = []

    logger.info(
      {
        batchRequests: callsToProcess.length,
      },
      'Sending multicall batch ',
    )

    const results = await this.multicallContract.callStatic.aggregate3(
      callsToProcess.map((calls) => {
        return {
          allowFailure: true,
          target: calls.callParams.to as string,
          callData: calls.callParams.data as string,
        }
      }),
    )

    // Decode the responses.
    results.forEach(({ success, returnData }, i) => {
      if (!success) {
        logger.error(returnData, 'A request inside a multicall batch failed')
        callsToProcess[i]?.reject(returnData)
      }
      callsToProcess[i]?.resolve(returnData)
    })
  }
}
