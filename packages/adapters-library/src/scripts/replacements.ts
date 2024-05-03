import { Answers } from 'inquirer'
import { Outcomes } from './newAdapter2Command'

// biome-ignore lint/suspicious/noExplicitAny: Useful for this placeholder
const EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK = '' as any

export const Replacements = {
  BUILD_METADATA: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, blankAdapter: string): string => {
      if (outcomes.buildMetadataFunction && outcomes.underlyingTokens) {
        const regex = /return·Replacements.BUILD_METADATA.placeholder/g

        switch (true) {
          case outcomes.buildMetadataFunction === 'singleProtocolToken' &&
            outcomes.underlyingTokens === 'oneUnderlying':
            return blankAdapter.replace(
              regex,
              `const protocolToken = await this.helpers.getTokenMetadata(
                  getAddress('0x')
                )
            
                const underlyingTokens = await this.helpers.getTokenMetadata(
                  getAddress('0x')
                )
                return {
                  [protocolToken.address]: {
                    protocolToken: protocolToken,
                    underlyingTokens: [underlyingTokens],
                  },
                }`,
            )
          case outcomes.buildMetadataFunction === 'singleProtocolToken' &&
            outcomes.underlyingTokens === 'multipleUnderlying':
            return blankAdapter.replace(
              regex,
              `const protocolToken = await this.helpers.getTokenMetadata(
                  '0x'
                )
            
                const underlyingTokensOne = await this.helpers.getTokenMetadata(
                  '0x'
                )
                const underlyingTokensTwo = await this.helpers.getTokenMetadata(
                  '0x'
                )
                return {
                  [protocolToken.address]: {
                    protocolToken: protocolToken,
                    underlyingTokens: [underlyingTokensOne, underlyingTokensTwo],
                  },
                }`,
            )
          case outcomes.buildMetadataFunction === 'multipleProtocolTokens' &&
            outcomes.underlyingTokens === 'oneUnderlying':
            return blankAdapter.replace(
              regex,
              'throw new NotImplementedError()',
            )
          case outcomes.buildMetadataFunction === 'multipleProtocolTokens' &&
            outcomes.underlyingTokens === 'multipleUnderlying':
            return blankAdapter.replace(
              regex,
              'throw new NotImplementedError()',
            )
          default:
            return blankAdapter.replace(
              regex,
              'throw new NotImplementedError()',
            )
        }
      }

      return blankAdapter
    },
  },
  GET_PROTOCOL_TOKENS: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (
      outcomes: Outcomes,
      updatedTemplate: string,
      _answers: Answers,
    ): string => {
      const regexProtocolTokens =
        /return Replacements.GET_PROTOCOL_TOKENS.placeholder/g
      switch (outcomes.defiAssetStructure) {
        case 'singleProtocolToken' || 'multiProtocolToken':
          return updatedTemplate.replace(
            regexProtocolTokens,
            `return Object.values(await this.buildMetadata()).map(
                  ({ protocolToken }) => protocolToken,
                )`,
          )
        default:
          return updatedTemplate.replace(
            regexProtocolTokens,
            'throw new NotImplementedError()',
          )
      }
    },
  },
  GET_POSITIONS: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (
      outcomes: Outcomes,
      updatedTemplate: string,
      _answers: Answers,
    ): string => {
      if (outcomes.getPositions && outcomes.defiAssetStructure) {
        const replace = /return Replacements.GET_POSITIONS.placeholder/g

        switch (true) {
          case outcomes.getPositions === 'useBalanceOfHelper' &&
            outcomes.defiAssetStructure === 'singleProtocolToken':
            return updatedTemplate.replace(
              replace,
              `return this.helpers.getBalanceOfTokens({
                ...input,
                protocolTokens: await this.getProtocolTokens()
              })`,
            )
          case outcomes.getPositions === 'useBalanceOfHelper' &&
            outcomes.defiAssetStructure === 'multipleProtocolTokens':
            return updatedTemplate.replace(
              replace,
              `return this.helpers.getBalanceOfTokens({
                ...input,
                protocolTokens: await this.getProtocolTokens()
              })`,
            )
          default:
            return updatedTemplate.replace(
              replace,
              'throw new NotImplementedError()',
            )
        }
      }

      return updatedTemplate
    },
  },
  GET_WITHDRAWALS: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (
      outcomes: Outcomes,
      updatedTemplate: string,
      _answers: Answers,
    ): string => {
      if (outcomes.withdrawalsFunction) {
        const regexWithdrawals =
          /return Replacements.GET_WITHDRAWALS.placeholder/g

        switch (outcomes.withdrawalsFunction) {
          case 'useWithdrawalHelper':
            return updatedTemplate.replace(
              regexWithdrawals,
              `return this.helpers.withdrawals({
                  protocolToken: await this.getProtocolToken(protocolTokenAddress),
                  filter: { fromBlock, toBlock, userAddress }
                })`,
            )

          default:
            return updatedTemplate.replace(
              regexWithdrawals,
              'throw new NotImplementedError()',
            )
        }
      }

      return updatedTemplate
    },
  },
  GET_DEPOSITS: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (
      outcomes: Outcomes,
      updatedTemplate: string,
      _answers: Answers,
    ): string => {
      if (outcomes.depositsFunction) {
        const regexDeposits = /return Replacements.GET_DEPOSITS.placeholder/g

        switch (outcomes.depositsFunction) {
          case 'useDepositsHelper':
            return updatedTemplate.replace(
              regexDeposits,
              `return this.helpers.deposits({
                  protocolToken: await this.getProtocolToken(protocolTokenAddress),
                  filter: { fromBlock, toBlock, userAddress }
                })`,
            )

          default:
            return updatedTemplate.replace(
              regexDeposits,
              'throw new NotImplementedError()',
            )
        }
      }

      return updatedTemplate
    },
  },
  UNWRAP: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, updatedTemplate: string): string => {
      if (outcomes.unwrap) {
        const regex = /return Replacements.UNWRAP.placeholder/g

        switch (outcomes.unwrap) {
          case 'useUnwrapOneToOneMethod':
            return updatedTemplate.replace(
              regex,
              `return this.helpers.unwrapOneToOne({
                  protocolToken: await this.getProtocolToken(protocolTokenAddress),
                  underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress)
                })`,
            )
          case 'useUnwrapRatioMethod':
            return updatedTemplate.replace(
              regex,
              `return this.helpers.unwrapTokenAsRatio({
                  protocolToken: await this.getProtocolToken(protocolTokenAddress),
                  underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
                  blockNumber
                })`,
            )
          default:
            return updatedTemplate.replace(
              regex,
              'throw new NotImplementedError()',
            )
        }
      }

      return updatedTemplate
    },
  },
  ASSET_TYPE: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, updatedTemplate: string): string => {
      if (outcomes.defiAssetStructure) {
        const regex = /Replacements.ASSET_TYPE.placeholder/g

        switch (outcomes.defiAssetStructure) {
          case 'singleProtocolToken' || 'multipleProtocolTokens':
            return updatedTemplate.replace(regex, 'AssetType.StandardErc20')

          default:
            return updatedTemplate.replace(regex, 'AssetType.NonStandardErc20')
        }
      }

      return updatedTemplate
    },
  },
  TVL: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, updatedTemplate: string): string => {
      if (outcomes.defiAssetStructure) {
        const regex = /return Replacements.TVL.placeholder/g

        switch (outcomes.defiAssetStructure) {
          case 'singleProtocolToken' || 'multipleProtocolTokens':
            return updatedTemplate.replace(
              regex,
              `const protocolTokens = await this.getProtocolTokens()
            
              return await this.helpers.tvl({
                protocolTokens,
                filterProtocolTokenAddresses: protocolTokenAddresses,
                blockNumber,
              })`,
            )

          default:
            return updatedTemplate.replace(
              regex,
              'throw new NotImplementedError()',
            )
        }
      }

      return updatedTemplate
    },
  },
  PRODUCT_ID: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (
      outcomes: Outcomes,
      updatedTemplate: string,
      answers: Answers,
    ): string => {
      return updatedTemplate.replace(
        /Replacements.PRODUCT_ID.placeholder/g,
        answers.protocolId,
      )
    },
  },
  PROTOCOL_ID: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (
      outcomes: Outcomes,
      updatedTemplate: string,
      answers: Answers,
    ): string => {
      return updatedTemplate.replace(
        /{{Replacements.PROTOCOL_ID.placeholder}}/g,
        answers.protocolId,
      )
    },
  },
  PROTOCOL_KEY: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (
      outcomes: Outcomes,
      updatedTemplate: string,
      answers: Answers,
    ): string => {
      return updatedTemplate.replace(
        /Replacements.PROTOCOL_KEY.placeholder/g,
        answers.protocolKey,
      )
    },
  },
  ADAPTER_CLASS_NAME: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (
      outcomes: Outcomes,
      updatedTemplate: string,
      answers: Answers,
    ): string => {
      return updatedTemplate.replace(
        /ADAPTER_CLASS_NAME/g,
        answers.adapterClassName,
      )
    },
  },
  GET_REWARD_POSITIONS: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, updatedTemplate: string): string => {
      if (outcomes.rewards) {
        const regexRewardPositions =
          /\/\/Replacements.GET_REWARD_POSITIONS.placeholder/g

        switch (outcomes.rewards) {
          case 'addRewards':
            return updatedTemplate.replace(
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

          default:
            return updatedTemplate.replace(regexRewardPositions, '')
        }
      }

      return updatedTemplate
    },
  },
  GET_REWARD_WITHDRAWALS: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, updatedTemplate: string): string => {
      if (outcomes.rewards) {
        const regexRewardWithdrawals = RegExp(
          /\/\/Replacements.GET_REWARD_WITHDRAWALS.placeholder/,
          'g',
        )

        const regexGetWithdrawalsFunctionName = RegExp(/getWithdrawals/, 'g')
        switch (outcomes.rewards) {
          case 'addRewards':
            return updatedTemplate
              .replace(
                regexGetWithdrawalsFunctionName,
                'getWithdrawalsWithoutRewards',
              )
              .replace(
                regexRewardWithdrawals,
                `async getRewardWithdrawals({
                  userAddress,
                  protocolTokenAddress,
                }: GetEventsInput): Promise<MovementsByBlock[]> {
                  throw new NotImplementedError()
                }`,
              )

          default:
            return updatedTemplate.replace(regexRewardWithdrawals, '')
        }
      }

      return updatedTemplate
    },
  },
  IMPLEMENTS_REWARDS_ADAPTER: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, updatedTemplate: string): string => {
      if (outcomes.rewards) {
        const regexGetPositionsFunctionName = /getPositions/g

        switch (outcomes.rewards) {
          case 'addRewards':
            return updatedTemplate
              .replace(
                regexGetPositionsFunctionName,
                'getPositionsWithoutRewards',
              )
              .replace(/implements/g, 'extends RewardsAdapter implements')
              .replace(
                /this.provider = provider/g,
                `super({ helpers })
                this.provider = provider`,
              )
        }
      }

      return updatedTemplate
    },
  },
} as const
