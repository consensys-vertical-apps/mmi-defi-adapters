import { NotImplementedError } from '../core/errors/errors'

class Helpers {
  balanceOfTokens() {
    throw new NotImplementedError()
  }
  balanceOfToken() {
    throw new NotImplementedError()
  }
  withdrawals() {
    throw new NotImplementedError()
  }
  deposits() {
    throw new NotImplementedError()
  }
}

export const helpers = new Helpers()
