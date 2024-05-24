import { Protocol } from '../../adapters/protocols'
import { Chain, ChainName } from '../constants/chains'

class BaseError extends Error {
  constructor(message: string) {
    super(message)
    // Ensures the stack trace starts from the location where this error was instantiated
    Error.captureStackTrace(this, this.constructor)

    // Enhance the error name with the class name
    this.name = this.constructor.name

    // Attempt to parse the stack trace and conditionally append context to the message
    const context = this.parseErrorStack()
    if (context) {
      this.message += ` (at ${context})`
    }
  }

  /**
   * Attempts to parse the error stack to find the first occurrence of "at Class.method".
   * Only returns a meaningful context if found; otherwise, returns an empty string.
   * @returns A string representing the initial class.method context from the stack trace, or an empty string if not found.
   */
  private parseErrorStack(): string {
    if (!this.stack) return ''

    // Split the stack trace into lines for processing
    const stackLines = this.stack.split('\n')
    // Find the first line that includes the pattern "at "
    const callerLine = stackLines.find((line) => line.includes('at '))

    if (!callerLine) return ''

    // Simplified regex to match "at Class.method"
    const match = callerLine.match(/at\s+(?:new\s+)?([^\s]+)\s+\(/)

    // Return the matched "Class.method" or an empty string if not found
    return match?.[1] ? match[1] : ''
  }
}

export class NotApplicableError extends BaseError {
  constructor() {
    super('Not Applicable')
  }
}

export class NotImplementedError extends BaseError {
  constructor() {
    super('Not Implemented')
  }
}

export class NotSupportedError extends BaseError {}

export class MaxMovementLimitExceededError extends BaseError {
  constructor() {
    super('Max Movement Limit Exceeded')
  }
}
export class ProtocolSmartContractNotDeployedAtRequestedBlockNumberError extends BaseError {
  chainId: Chain
  chainName: string
  protocolId: Protocol
  productId: string
  smartContractAddress: string
  blockNumber: number
  constructor(
    chainId: Chain,
    blockNumber: number,
    smartContractAddress: string,
    protocolId: Protocol,
    productId: string,
  ) {
    super('Protocol Smart Contract Not Deployed At Requested BlockNumber')

    this.name = 'Protocol Smart Contract Not Deployed At Requested BlockNumber'
    this.chainId = chainId
    this.chainName = ChainName[chainId]
    this.protocolId = protocolId
    this.productId = productId
    this.smartContractAddress = smartContractAddress
    this.blockNumber = blockNumber
  }
}

export class ProviderMissingError extends BaseError {
  chainId: Chain
  chainName: string

  constructor(chainId: Chain) {
    super('No provider found for chain')

    this.chainId = chainId
    this.chainName = ChainName[chainId]
  }
}

export class AdapterMissingError extends BaseError {
  chainId: Chain
  chainName: string
  protocolId: Protocol
  productId?: string

  constructor(chainId: Chain, protocolId: Protocol, productId?: string) {
    super('No adapter found')

    this.chainId = chainId
    this.chainName = ChainName[chainId]
    this.protocolId = protocolId
    this.productId = productId
  }
}

export class MulticallError extends BaseError {
  chainId: Chain
  chainName: string
  flushTimeoutMs: number
  maxBatchSize: number

  constructor({
    message,
    chainId,
    flushTimeoutMs,
    maxBatchSize,
  }: {
    message: string
    chainId: Chain
    flushTimeoutMs: number
    maxBatchSize: number
  }) {
    super(`Multicall batch failed: ${message}`)

    this.chainId = chainId
    this.chainName = ChainName[chainId]
    this.flushTimeoutMs = flushTimeoutMs
    this.maxBatchSize = maxBatchSize
  }
}
