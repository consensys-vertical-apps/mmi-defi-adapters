import {
  AbiCoder,
  type AddressLike,
  type BytesLike,
  type FetchRequest,
  type JsonRpcProvider,
  Network,
  type TransactionRequest,
  ethers,
} from 'ethers'
import type { Multicall, Multicall3 } from '../../contracts/Multicall.js'
import { count } from '../../metricsCount.js'
import type { EvmChain } from '../constants/chains.js'
import { MulticallError } from '../errors/errors.js'
import { logger } from '../utils/logger.js'

import { Multicall__factory } from '../../contracts/index.js'
import { MULTICALL_ADDRESS } from '../constants/MULTICALL_ADDRESS.js'

interface PendingCall {
  callParams: {
    target: AddressLike
    callData: BytesLike
    allowFailure: boolean
  }
  resolve: (value: string) => void
  reject: (reason: Error) => void
}
const LATEST = 'latest'
type PendingCallsMap = Record<string | typeof LATEST, PendingCall[]>

export class MulticallQueue {
  private chainId: EvmChain
  private pendingCalls: PendingCallsMap = {}
  // private multicallContract: Multicall
  private flushTimeoutMs: number
  private maxBatchSize: number
  private _timer: NodeJS.Timeout | null = null

  private multicallContract: Multicall

  private provider: JsonRpcProvider

  constructor({
    fetchRequest,
    flushTimeoutMs,
    maxBatchSize,
    chainId,
  }: {
    fetchRequest: FetchRequest
    flushTimeoutMs: number
    maxBatchSize: number

    chainId: EvmChain
  }) {
    this.flushTimeoutMs = flushTimeoutMs
    this.maxBatchSize = maxBatchSize
    this.provider = new ethers.JsonRpcProvider(
      fetchRequest,
      Network.from(chainId),
      {
        staticNetwork: Network.from(chainId),
      },
    )
    this.chainId = chainId

    this.multicallContract = Multicall__factory.connect(
      MULTICALL_ADDRESS,
      this.provider,
    )
  }

  private set timer(value: NodeJS.Timeout | null) {
    if (this._timer) clearTimeout(this._timer)
    this._timer = value
  }

  private get timer() {
    return this._timer
  }

  async queueCall(callParams: TransactionRequest): Promise<string> {
    if (callParams.from) {
      logger.error(
        'MulticallQueue unable to handle from parameter, use standard json rpc provider instead',
      )
      throw new Error(
        'MulticallQueue unable to handle from parameter, use standard json rpc provider instead',
      )
    }
    const { to, data, blockTag } = this.getParams(callParams)

    return new Promise((resolve, reject) => {
      if (!this.pendingCalls[blockTag]) {
        this.pendingCalls[blockTag] = []
      }

      this.pendingCalls[blockTag]!.push({
        callParams: { target: to, callData: data, allowFailure: true },
        resolve,
        reject,
      })

      if (this.pendingCalls[blockTag]!.length >= this.maxBatchSize) {
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
    const currentPendingCalls: PendingCallsMap = this.pendingCalls
    this.pendingCalls = {}

    for (const [blockTag, callsToProcess] of Object.entries(
      currentPendingCalls,
    )) {
      const batchSize = callsToProcess.length

      let results: Multicall3.ResultStructOutput[]
      try {
        const startTime = Date.now()
        results = await this.multicallContract.aggregate3.staticCall(
          callsToProcess.map(({ callParams }) => callParams),
          {
            blockTag: blockTag === LATEST ? undefined : blockTag,
          },
        )

        const endTime = Date.now()

        // update metrics
        count[this.chainId].multicallRequests.totalInternalRequest += batchSize
        count[this.chainId].multicallRequests.total += 1
        const totalTime = endTime - startTime
        if (totalTime > count[this.chainId].multicallRequests.maxRequestTime) {
          count[this.chainId].multicallRequests.maxRequestTime = totalTime
        }

        logger.debug({
          source: 'multicall-batch',
          chainId: this.chainId,
          flushTimeoutMs: this.flushTimeoutMs,
          maxBatchSize: this.maxBatchSize,
          batchSize,
          blockTag,
          startTime,
          endTime,
          timeTaken: totalTime,
        })

        // biome-ignore lint/suspicious/noExplicitAny: Error is checked
      } catch (error: any) {
        callsToProcess.forEach(({ reject }) => {
          reject(
            new MulticallError({
              message: `${error.code ? `(${error.code}) ` : ''}${
                error.message
              }`,
              chainId: this.chainId,
              flushTimeoutMs: this.flushTimeoutMs,
              maxBatchSize: this.maxBatchSize,
            }),
          )
        })

        logger.error(
          {
            source: 'multicall-batch:error',
            chainId: this.chainId,
            flushTimeoutMs: this.flushTimeoutMs,
            maxBatchSize: this.maxBatchSize,
            batchSize,
            blockTag,
            error: {
              code: error.code,
              message: error.message,
            },
          },
          'Multicall error when sending a batch',
        )

        return
      }

      const resultLength = results.length

      if (resultLength !== batchSize) {
        // reject all to be on safe side
        callsToProcess.forEach(({ reject }) => {
          reject(
            new MulticallError({
              message: 'Response length mismatch',
              chainId: this.chainId,
              flushTimeoutMs: this.flushTimeoutMs,
              maxBatchSize: this.maxBatchSize,
            }),
          )
        })

        logger.error(
          {
            chainId: this.chainId,
            flushTimeoutMs: this.flushTimeoutMs,
            maxBatchSize: this.maxBatchSize,
            resultLength,
            batchSize,
          },
          'Multicall response length differs from batch sent',
        )

        return
      }

      callsToProcess.forEach(
        ({ callParams: { target, callData }, resolve, reject }, i) => {
          const result = results[i]
          if (!result) return

          const { returnData, success } = result

          if (!success) {
            logger.debug(
              { contractAddress: target, callData },
              'A request inside a multicall batch failed',
            )

            const error = AbiCoder.getBuiltinCallException(
              'call',
              {},
              returnData,
            )

            reject(error)
          } else {
            resolve(returnData)
          }
        },
      )
    }
  }

  private getParams(callParams: TransactionRequest) {
    const { to, data, blockTag } = callParams

    if (!to && !data) {
      logger.error(
        callParams,
        'To and Data is required when using MulticallQueue',
      )
      throw new Error('To and Data are required when using MulticallQueue')
    }

    if (!to) {
      logger.error(callParams, 'To is required when using MulticallQueue')
      throw new Error('To is required when using MulticallQueue')
    }
    if (!data) {
      logger.error(callParams, 'Data is required when using MulticallQueue')
      throw new Error('Data is required when using MulticallQueue')
    }
    const blockTagStr = blockTag ? `0x${blockTag.toString(16)}` : LATEST

    return { to, data, blockTag: blockTagStr }
  }
}
