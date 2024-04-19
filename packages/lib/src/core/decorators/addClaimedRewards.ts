import { GetEventsInput } from '../../types/adapter'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { SimplePoolAdapter } from '../adapters/SimplePoolAdapter'

export function AddClaimedRewards({
  rewardAdapterIds,
}: {
  rewardAdapterIds: string[]
}) {
  return function actualDecorator(
    originalMethod: SimplePoolAdapter['getWithdrawals'],
    _context: ClassMethodDecoratorContext,
  ) {
    async function replacementMethod(
      this: IProtocolAdapter,
      input: GetEventsInput,
    ) {
      const movements = await originalMethod.call(this, input)

      await Promise.all(
        rewardAdapterIds.map(async (rewardAdapterId) => {
          const rewardAdapter = await this.adaptersController.fetchAdapter(
            this.chainId,
            this.protocolId,
            rewardAdapterId,
          )

          const isSupported = (await rewardAdapter.getProtocolTokens()).find(
            (token) => token.address == input.protocolTokenAddress,
          )

          if (!isSupported) {
            return
          }

          const claimedRewards = await rewardAdapter.getWithdrawals(input)

          movements.push(...claimedRewards)
        }),
      )

      return movements
    }

    return replacementMethod
  }
}
