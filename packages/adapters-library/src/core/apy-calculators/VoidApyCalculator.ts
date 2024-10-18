import { ApyCalculator, GetApyArgs } from './ApyCalculator'

/**
 * Default APY calculator that no-ops.
 */
export class VoidApyCalculator implements ApyCalculator {
  public async getApy({
    blocknumberStart,
    blocknumberEnd,
    protocolTokenAddress,
  }: GetApyArgs): Promise<undefined> {
    return Promise.resolve(undefined)
  }
}
