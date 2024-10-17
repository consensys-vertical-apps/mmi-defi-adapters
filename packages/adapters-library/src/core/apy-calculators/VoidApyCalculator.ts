import { ApyCalculator, GetApyArgs, VoidApyInfo } from './ApyCalculator'

/**
 * Default APY calculator that no-ops.
 */
export class VoidApyCalculator implements ApyCalculator {
  public async getApy({
    blocknumberStart,
    blocknumberEnd,
    protocolTokenAddress,
  }: GetApyArgs): Promise<VoidApyInfo> {
    return Promise.resolve(undefined as unknown as VoidApyInfo)
    //     return Promise.resolve({
    //       apyPercent: null,
    //       apy: null,
    //       aprPercent: null,
    //       apr: null,
    //       period: {
    //         blocknumberStart,
    //         blocknumberEnd,
    //         interestPercent: null,
    //         interest: null,
    //       },
    //       compounding: {
    //         durationDays: null,
    //         frequency: null,
    //       },
    //       protocolTokenAddress,
    //     })
  }
}
