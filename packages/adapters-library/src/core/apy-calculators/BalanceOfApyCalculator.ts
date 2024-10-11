import { AVERAGE_BLOCKS_PER_DAY } from '../constants/AVERAGE_BLOCKS_PER_DAY'
import { ApyCalculation, ApyCalculator, EvmApyArgs } from './ApyCalculator'
import { computeApr, computeApy } from './common'

/**
 * Calculates the APY of a position by calculating the fees as the difference of balance in
 * the underlying token between a given day and the day before.
 *
 * Is compatible with ANY DeFi protocol where the position is tracked by a single amount in wei (for instance the balanceOf an ERC20),
 * and where the balance varies only due to accruing fees/interest ( assuming no deposit or withdrawal).
 *
 * We can translate this mathematically to:
 * balance(t') = balance(t) + fees(t)
 *
 * Compatible protocols / products are:
 * - Stablecoins
 * - Lending (aToken, cToken, ...)
 * - LSTs
 */
export class BalanceOfApyCalculator implements ApyCalculator<EvmApyArgs> {
  // Duration in days of the period where we look at the fees earned. The APY and APR are then annualized based on this period.
  public static readonly PERIOD_DURATION_DAYS = 1

  // How many periods there is in a year
  public static readonly FREQUENCY = 365

  public async getApy({
    userAddress,
    blockNumber,
    protocolTokenAddress,
    chainId,
    adapter,
  }: EvmApyArgs): Promise<ApyCalculation> {
    const blocknumberEnd = blockNumber
    const blocknumberStart =
      blocknumberEnd -
      AVERAGE_BLOCKS_PER_DAY[chainId] *
        BalanceOfApyCalculator.PERIOD_DURATION_DAYS

    const [positionsStart, positionsEnd] = await Promise.all([
      adapter.getPositions({
        userAddress,
        blockNumber: blocknumberStart,
        protocolTokenAddresses: [protocolTokenAddress],
      }),
      adapter.getPositions({
        userAddress,
        blockNumber: blocknumberEnd,
        protocolTokenAddresses: [protocolTokenAddress],
      }),
    ])

    const balanceStartWei =
      positionsStart?.[0]?.tokens?.[0]?.tokens?.[0]?.balanceRaw
    const balanceEndWei =
      positionsEnd?.[0]?.tokens?.[0]?.tokens?.[0]?.balanceRaw

    const noBalanceErrorMessage = `Could not find an underlying token balance for userAddress ${userAddress} for protocolTokenAddress ${protocolTokenAddress} on chain ${chainId}`
    if (!balanceStartWei)
      throw new Error(
        `${noBalanceErrorMessage} at block number ${blocknumberEnd}.`,
      )
    if (!balanceEndWei)
      throw new Error(
        `${noBalanceErrorMessage} at block number ${blocknumberStart}.`,
      )

    const interest = this.computeInterest(balanceStartWei, balanceEndWei)
    const interestPercent = interest * 100

    const apr = computeApr(interest, BalanceOfApyCalculator.FREQUENCY)
    const aprPercent = apr * 100

    const apy = computeApy(apr, BalanceOfApyCalculator.FREQUENCY)
    const apyPercent = apy * 100

    return {
      apyPercent,
      apy,
      aprPercent,
      apr,
      period: {
        blocknumberStart,
        blocknumberEnd,
        interestPercent,
        interest,
      },
      compounding: {
        strategy: 'daily',
        frequency: BalanceOfApyCalculator.FREQUENCY,
      },
      userAddress,
      protocolTokenAddress,
    }
  }

  protected computeInterest(
    balanceStartWei: bigint,
    balanceEndWei: bigint,
  ): number {
    if (!balanceEndWei && balanceEndWei !== 0n)
      throw new Error('Argument balanceEndWei must be defined')

    if (balanceStartWei === 0n)
      throw new Error(
        'Argument balanceStartWei cannot be equal to zero as it would lead to division by zero',
      )

    if (!balanceStartWei)
      throw new Error('Argument balanceStartWei must be defined')

    const feesWei = balanceEndWei - balanceStartWei

    // Multiply by a large constant (e.g., 1e18) to retain precision
    const precisionFactor = 10n ** 18n

    // Scale up the fees to retain precision
    const interestScaled = (feesWei * precisionFactor) / balanceStartWei

    return Number(interestScaled) / Number(precisionFactor)
  }
}
