import { Chain } from '@metamask-institutional/defi-adapters'
import { ChainName } from '../constants/chains'

export class NotApplicableError extends Error {
  constructor(message = 'Not Applicable') {
    super(message)

    Error.captureStackTrace(this, NotApplicableError)

    this.name = 'NotApplicableError'
  }
}

export class NotImplementedError extends Error {
  constructor(message = 'Not Implemented') {
    super(message)

    Error.captureStackTrace(this, NotImplementedError)

    this.name = 'NotImplementedError'
  }
}

export class ProviderMissingError extends Error {
  chainId: Chain
  chainName: string

  constructor(chainId: Chain, message = 'No provider found for chain') {
    super(message)

    Error.captureStackTrace(this, ProviderMissingError)

    this.name = 'ProviderMissingError'
    this.chainId = chainId
    this.chainName = ChainName[chainId]
  }
}
