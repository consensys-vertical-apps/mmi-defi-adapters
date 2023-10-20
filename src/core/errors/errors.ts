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
