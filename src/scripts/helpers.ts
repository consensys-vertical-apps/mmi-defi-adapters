import { NotImplementedError } from '../core/errors/errors'

class Helpers {
  getBalanceOfTokens(): any {
    throw new NotImplementedError()
  }
  getBalanceOfToken(): any {
    throw new NotImplementedError()
  }
  withdrawals(): any {
    throw new NotImplementedError()
  }
  deposits(): any {
    throw new NotImplementedError()
  }
  getTokenMetadata(): any {
    throw new NotImplementedError()
  }
}

export const helpers = new Helpers()
