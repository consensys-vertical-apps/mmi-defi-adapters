import { GetPositionsInput } from '../../types/adapter'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { SimplePoolAdapter } from '../adapters/SimplePoolAdapter'
import { logger } from '../utils/logger'

export function AddClaimableRewards({
  rewardAdapterIds,
}: {
  rewardAdapterIds: string[]
}) {
  return function actualDecorator(
    originalMethod: SimplePoolAdapter['getPositions'],
    _context: ClassMethodDecoratorContext,
  ) {
    async function replacementMethod(
      this: IProtocolAdapter,
      input: GetPositionsInput,
    ) {
      const protocolTokens = await originalMethod.call(this, input)

      await Promise.all(
        rewardAdapterIds.map(async (rewardAdapterId) => {
          let rewardAdapter: IProtocolAdapter
          try {
            rewardAdapter = this.adaptersController.fetchAdapter(
              this.chainId,
              this.protocolId,
              rewardAdapterId,
            )
          } catch (error) {
            logger.error(
              {
                chainId: this.chainId,
                protocolId: this.protocolId,
                rewardAdapter: rewardAdapterId,
              },
              'Reward adapter not found',
            )
            throw new Error(`Reward adapter: "${rewardAdapterId}" not found`)
          }

          await Promise.all(
            protocolTokens.map(async (protocolToken) => {
              const isSupported = (
                await rewardAdapter.getProtocolTokens()
              ).find((token) => token.address == protocolToken.address)

              if (!isSupported) {
                return
              }

              const [reward] = await rewardAdapter.getPositions({
                ...input,
                protocolTokenAddresses: [protocolToken.address],
              })

              if (reward && reward.tokens && reward.tokens.length > 0) {
                protocolToken.tokens = [
                  ...(protocolToken.tokens ?? []),
                  ...reward.tokens,
                ]
              }
            }),
          )
        }),
      )

      return protocolTokens
    }

    return replacementMethod
  }
}
