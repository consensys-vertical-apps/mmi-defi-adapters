import { AbiCoder, AddressLike, BytesLike } from 'ethers'
import { Multicall, Multicall3 } from '../../../contracts/Multicall'
import { Chain } from '../../constants/chains'
import { MulticallError } from '../../errors/errors'
import { logger } from '../logger'
import { CustomTransactionRequest } from '../provider/CustomMulticallJsonRpcProvider'

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
  private chainId: Chain
  private pendingCalls: PendingCallsMap = {}
  private multicallContract: Multicall
  private flushTimeoutMs: number
  private maxBatchSize: number
  private _timer: NodeJS.Timeout | null = null

  constructor({
    flushTimeoutMs,
    maxBatchSize,
    multicallContract,
    chainId,
  }: {
    flushTimeoutMs: number
    maxBatchSize: number
    multicallContract: Multicall
    chainId: Chain
  }) {
    this.flushTimeoutMs = flushTimeoutMs
    this.maxBatchSize = maxBatchSize
    this.multicallContract = multicallContract
    this.chainId = chainId
  }

  private set timer(value: NodeJS.Timeout | null) {
    if (this._timer) clearTimeout(this._timer)
    this._timer = value
  }

  private get timer() {
    return this._timer
  }

  async queueCall(callParams: CustomTransactionRequest): Promise<string> {
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
      logger.debug({ batchSize }, 'Sending multicall batch ')

      let results: Multicall3.ResultStructOutput[]
      try {
        results = await this.multicallContract.aggregate3.staticCall(
          callsToProcess.map(({ callParams }) => callParams),
          {
            blockTag: blockTag == LATEST ? undefined : blockTag,
          },
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        callsToProcess.forEach(({ reject }) => {
          reject(
            new MulticallError({
              message: 'RPC provider error',
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
            batchSize,
            error: error?.info?.error,
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

  private getParams(callParams: CustomTransactionRequest) {
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
    const blockTagStr = blockTag ? '0x' + blockTag.toString(16) : LATEST

    return { to, data, blockTag: blockTagStr }
  }
}
