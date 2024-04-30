import type { Answers } from 'inquirer'
import { ReplacementPlaceholder } from '../core/adapters/replacementPlaceholder'
import type { Outcomes } from './newAdapter2Command'

export const ReplacementMethods: Record<
  keyof typeof ReplacementPlaceholder,
  (outcomes: Outcomes, template: string, answers: Answers) => string
> = {
  BUILD_METADATA: (outcomes: Outcomes, template: string) => {
    if (outcomes.buildMetadataFunction && outcomes.underlyingTokens) {
      const regex = new RegExp(
        'return ReplacementPlaceholder.BUILD_METADATA',
        'g',
      )

      switch (true) {
        case outcomes.buildMetadataFunction === 'singleProtocolToken' &&
          outcomes.underlyingTokens === 'oneUnderlying':
          template = template.replace(
            regex,
            `const protocolToken = await helpers.getTokenMetadata(
                getAddress('0x'),
                this.chainId,
                this.provider,
              )
          
              const underlyingTokens = await helpers.getTokenMetadata(
                getAddress('0x'),
                this.chainId,
                this.provider,
              )
              return {
                [protocolToken.address]: {
                  protocolToken: protocolToken,
                  underlyingTokens: [underlyingTokens],
                },
              }`,
          )
          break
        case outcomes.buildMetadataFunction === 'singleProtocolToken' &&
          outcomes.underlyingTokens === 'multipleUnderlying':
          template = template.replace(
            regex,
            `const protocolToken = await helpers.getTokenMetadata(
                '0x',
                this.chainId,
                this.provider,
              )
          
              const underlyingTokensOne = await helpers.getTokenMetadata(
                '0x',
                this.chainId,
                this.provider,
              )
              const underlyingTokensTwo = await helpers.getTokenMetadata(
                '0x',
                this.chainId,
                this.provider,
              )
              return {
                [protocolToken.address]: {
                  protocolToken: protocolToken,
                  underlyingTokens: [underlyingTokensOne, underlyingTokensTwo],
                },
              }`,
          )
          break
        case outcomes.buildMetadataFunction === 'multipleProtocolTokens' &&
          outcomes.underlyingTokens === 'oneUnderlying':
          template = template.replace(regex, `throw new NotImplementedError()`)
          break
        case outcomes.buildMetadataFunction === 'multipleProtocolTokens' &&
          outcomes.underlyingTokens === 'multipleUnderlying':
          template = template.replace(regex, `throw new NotImplementedError()`)
          break
        default:
          template = template.replace(regex, 'throw new NotImplementedError()')
          break
      }
    }

    return template
  },
  GET_PROTOCOL_TOKENS: (outcomes: Outcomes, template: string): string => {
    const regexProtocolTokens = new RegExp(
      'return ReplacementPlaceholder.GET_PROTOCOL_TOKENS',
      'g',
    )
    switch (outcomes.defiAssetStructure) {
      case 'singleProtocolToken' || 'multiProtocolToken':
        template = template.replace(
          regexProtocolTokens,
          `return Object.values(await this.buildMetadata()).map(
                ({ protocolToken }) => protocolToken,
              )`,
        )

        break
      default:
        template = template.replace(
          regexProtocolTokens,
          'throw new NotImplementedError()',
        )

        break
    }
    return template
  },
  GET_POSITIONS: (outcomes: Outcomes, template: string): string => {
    if (outcomes.getPositions && outcomes.defiAssetStructure) {
      const replace = new RegExp(
        'return ReplacementPlaceholder.GET_POSITIONS',
        'g',
      )

      switch (true) {
        case outcomes.getPositions == 'useBalanceOfHelper' &&
          outcomes.defiAssetStructure == 'singleProtocolToken':
          template = template.replace(
            replace,
            `return helpers.getBalanceOfTokens({
              ..._input,
              protocolTokens: await this.getProtocolTokens(),
              provider: this.provider
            })`,
          )
          break
        case outcomes.getPositions == 'useBalanceOfHelper' &&
          outcomes.defiAssetStructure == 'multipleProtocolTokens':
          template = template.replace(
            replace,
            `return helpers.getBalanceOfTokens({
              ..._input,
              protocolTokens: await this.getProtocolTokens(),
              provider: this.provider
            })`,
          )
          break
        default:
          template = template.replace(
            replace,
            'throw new NotImplementedError()',
          )
          break
      }
    }
    return template
  },
  GET_WITHDRAWALS: (outcomes: Outcomes, template: string): string => {
    if (outcomes.withdrawalsFunction) {
      const regexWithdrawals = new RegExp(
        'return ReplacementPlaceholder.GET_WITHDRAWALS',
        'g',
      )

      switch (outcomes.withdrawalsFunction) {
        case 'useWithdrawalHelper':
          template = template.replace(
            regexWithdrawals,
            `return helpers.withdrawals({
                protocolToken: await this.getProtocolToken(protocolTokenAddress),
                filter: { fromBlock, toBlock, userAddress },
                provider: this.provider,
              })`,
          )

          break
        default:
          template = template.replace(
            regexWithdrawals,
            'throw new NotImplementedError()',
          )

          break
      }
    }
    return template
  },
  GET_DEPOSITS: (outcomes: Outcomes, template: string): string => {
    if (outcomes.depositsFunction) {
      const regexDeposits = new RegExp(
        'return ReplacementPlaceholder.GET_DEPOSITS',
        'g',
      )

      switch (outcomes.depositsFunction) {
        case 'useDepositsHelper':
          template = template.replace(
            regexDeposits,
            `return helpers.deposits({
                protocolToken: await this.getProtocolToken(protocolTokenAddress),
                filter: { fromBlock, toBlock, userAddress },
                provider: this.provider,
              })`,
          )
          break
        default:
          template = template.replace(
            regexDeposits,
            'throw new NotImplementedError()',
          )
          break
      }
    }
    return template
  },
  UNWRAP: (outcomes: Outcomes, template: string): string => {
    if (outcomes.unwrap) {
      const regex = new RegExp('return ReplacementPlaceholder.UNWRAP', 'g')

      switch (outcomes.unwrap) {
        case 'useOneToOneMethod':
          template = template.replace(
            regex,
            `return helpers.unwrapOneToOne({
                protocolToken: await this.getProtocolToken(_input.protocolTokenAddress),
                underlyingTokens: await this.getUnderlyingTokens(_input.protocolTokenAddress)
              })`,
          )
          break
        default:
          template = template.replace(regex, 'throw new NotImplementedError()')
          break
      }
    }
    return template
  },
  ASSET_TYPE: (outcomes: Outcomes, template: string): string => {
    if (outcomes.defiAssetStructure) {
      const regex = new RegExp('return ReplacementPlaceholder.ASSET_TYPE', 'g')

      switch (outcomes.defiAssetStructure) {
        case 'singleProtocolToken' || 'multipleProtocolTokens':
          template = template.replace(regex, `AssetType.StandardErc20`)
          break

        default:
          template = template.replace(regex, `AssetType.NonStandardErc20`)
          break
      }
    }
    return template
  },
  PRODUCT_ID: (
    outcomes: Outcomes,
    template: string,
    answers: Answers,
  ): string => {
    return template.replace(
      /ReplacementPlaceholder.PRODUCT_ID/g,
      answers.protocolId,
    )
  },
  PROTOCOL_ID: (
    outcomes: Outcomes,
    template: string,
    answers: Answers,
  ): string => {
    return template.replace(
      /{{ReplacementPlaceholder.PROTOCOL_ID}}/g,
      answers.protocolId,
    )
  },
  PROTOCOL_KEY: (
    outcomes: Outcomes,
    template: string,
    answers: Answers,
  ): string => {
    return template.replace(
      /ReplacementPlaceholder.PROTOCOL_KEY/g,
      answers.protocolKey,
    )
  },
  ADAPTER_CLASS_NAME: (
    outcomes: Outcomes,
    template: string,
    answers: Answers,
  ): string => {
    return template.replace(/ADAPTER_CLASS_NAME/g, answers.adapterClassName)
  },
  GET_REWARD_POSITIONS: (outcomes: Outcomes, template: string): string => {
    if (outcomes.rewards) {
      const regexRewardPositions =
        /\/\/ReplacementPlaceholder.GET_REWARD_POSITIONS/g

      switch (outcomes.rewards) {
        case 'addRewards':
          template = template.replace(
            regexRewardPositions,
            `async getRewardPositions({
                userAddress,
                protocolTokenAddress,
                blockNumber,
              }: {
                userAddress: string
                blockNumber?: number
                protocolTokenAddress: string
              }): Promise<Underlying[]> {
                throw new NotImplementedError()
              }`,
          )

          break
        default:
          template = template.replace(regexRewardPositions, '')

          break
      }
    }
    return template
  },
  GET_REWARD_WITHDRAWALS: (outcomes: Outcomes, template: string): string => {
    if (outcomes.rewards) {
      const regexRewardWithdrawals = RegExp(
        /\/\/ReplacementPlaceholder.GET_REWARD_WITHDRAWALS/,
        'g',
      )

      const regexGetWithdrawalsFunctionName = RegExp(/getWithdrawals/, 'g')
      switch (outcomes.rewards) {
        case 'addRewards':
          template = template.replace(
            regexGetWithdrawalsFunctionName,
            `getWithdrawalsWithoutRewards`,
          )
          template = template.replace(
            regexRewardWithdrawals,
            `async getRewardWithdrawals({
                userAddress,
                protocolTokenAddress,
              }: GetEventsInput): Promise<MovementsByBlock[]> {
                throw new NotImplementedError()
              }`,
          )

          break
        default:
          template = template.replace(regexRewardWithdrawals, '')
          break
      }
    }
    return template
  },
  IMPLEMENTS_REWARDS_ADAPTER: (
    outcomes: Outcomes,
    template: string,
  ): string => {
    if (outcomes.rewards) {
      const regexGetPositionsFunctionName = /getPositions/g

      switch (outcomes.rewards) {
        case 'addRewards':
          template = template.replace(
            regexGetPositionsFunctionName,
            `getPositionsWithoutRewards`,
          )
          template = template.replace(
            /implements/g,
            `extends RewardsAdapter implements`,
          )
          template = template.replace(
            /this.provider = provider/g,
            `super()
              this.provider = provider`,
          )

          break
        default:
          break
      }
    }
    return template
  },
}
