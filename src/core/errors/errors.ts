import { Protocol } from '../../adapters/protocols'
import { Chain, ChainName } from '../constants/chains'

export class NotApplicableError extends Error {
  constructor() {
    super('Not Applicable')

    Error.captureStackTrace(this, NotApplicableError)

    this.name = 'NotApplicableError'
  }
}

export class NotImplementedError extends Error {
  constructor() {
    super('Not Implemented')

    Error.captureStackTrace(this, NotImplementedError)

    this.name = 'NotImplementedError'
  }
}
export class MaxMovementLimitExceededError extends Error {
  constructor() {
    super('Max Movement Limit Exceeded')

    Error.captureStackTrace(this, MaxMovementLimitExceededError)

    this.name = 'MaxMovementLimitExceededError'
  }
}
export class ProtocolSmartContractNotDeployedAtRequestedBlockNumberError extends Error {
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

    Error.captureStackTrace(
      this,
      ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
    )

    this.name = 'ProtocolSmartContractNotDeployedAtRequestedBlockNumber'
  }
}

export class ProviderMissingError extends Error {
  chainId: Chain
  chainName: string

  constructor(chainId: Chain) {
    super('No provider found for chain')

    Error.captureStackTrace(this, ProviderMissingError)

    this.name = 'ProviderMissingError'
    this.chainId = chainId
    this.chainName = ChainName[chainId]
  }
}

export class AdapterMissingError extends Error {
  chainId: Chain
  chainName: string
  protocolId: Protocol
  productId?: string

  constructor(chainId: Chain, protocolId: Protocol, productId?: string) {
    super('No adapter found')

    Error.captureStackTrace(this, AdapterMissingError)

    this.name = 'AdapterMissingError'
    this.chainId = chainId
    this.chainName = ChainName[chainId]
    this.protocolId = protocolId
    this.productId = productId
  }
}

export class MulticallError extends Error {
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

    Error.captureStackTrace(this, MulticallError)

    this.name = 'MulticallError'
    this.chainId = chainId
    this.chainName = ChainName[chainId]
    this.flushTimeoutMs = flushTimeoutMs
    this.maxBatchSize = maxBatchSize
  }
}
