import { Answers } from 'inquirer'
import { Outcomes } from './newAdapter2Command'

//eslint-disable-next-line
const EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK = '' as any

export const Replacements = {
  BUILD_METADATA: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, blankAdapter: string) => {
      if (outcomes.buildMetadataFunction && outcomes.underlyingTokens) {
        const regex = new RegExp(
          'return Replacements.BUILD_METADATA.placeholder',
          'g',
        )

        switch (true) {
          case outcomes.buildMetadataFunction === 'singleProtocolToken' &&
            outcomes.underlyingTokens === 'oneUnderlying':
            blankAdapter = blankAdapter.replace(
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
            blankAdapter = blankAdapter.replace(
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
            blankAdapter = blankAdapter.replace(
              regex,
              `throw new NotImplementedError()`,
            )
            break
          case outcomes.buildMetadataFunction === 'multipleProtocolTokens' &&
            outcomes.underlyingTokens === 'multipleUnderlying':
            blankAdapter = blankAdapter.replace(
              regex,
              `throw new NotImplementedError()`,
            )
            break
          default:
            blankAdapter = blankAdapter.replace(
              regex,
              'throw new NotImplementedError()',
            )
            break
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
      const regexProtocolTokens = new RegExp(
        'return Replacements.GET_PROTOCOL_TOKENS.placeholder',
        'g',
      )
      switch (outcomes.defiAssetStructure) {
        case 'singleProtocolToken' || 'multiProtocolToken':
          updatedTemplate = updatedTemplate.replace(
            regexProtocolTokens,
            `return Object.values(await this.buildMetadata()).map(
                  ({ protocolToken }) => protocolToken,
                )`,
          )

          break
        default:
          updatedTemplate = updatedTemplate.replace(
            regexProtocolTokens,
            'throw new NotImplementedError()',
          )

          break
      }
      return updatedTemplate
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
        const replace = new RegExp(
          'return Replacements.GET_POSITIONS.placeholder',
          'g',
        )

        switch (true) {
          case outcomes.getPositions == 'useBalanceOfHelper' &&
            outcomes.defiAssetStructure == 'singleProtocolToken':
            updatedTemplate = updatedTemplate.replace(
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
            updatedTemplate = updatedTemplate.replace(
              replace,
              `return helpers.getBalanceOfTokens({
                ..._input,
                protocolTokens: await this.getProtocolTokens(),
                provider: this.provider
              })`,
            )
            break
          default:
            updatedTemplate = updatedTemplate.replace(
              replace,
              'throw new NotImplementedError()',
            )
            break
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
        const regexWithdrawals = new RegExp(
          'return Replacements.GET_WITHDRAWALS.placeholder',
          'g',
        )

        switch (outcomes.withdrawalsFunction) {
          case 'useWithdrawalHelper':
            updatedTemplate = updatedTemplate.replace(
              regexWithdrawals,
              `return helpers.withdrawals({
                  protocolToken: await this.getProtocolToken(protocolTokenAddress),
                  filter: { fromBlock, toBlock, userAddress },
                  provider: this.provider,
                })`,
            )

            break
          default:
            updatedTemplate = updatedTemplate.replace(
              regexWithdrawals,
              'throw new NotImplementedError()',
            )

            break
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
        const regexDeposits = new RegExp(
          'return Replacements.GET_DEPOSITS.placeholder',
          'g',
        )

        switch (outcomes.depositsFunction) {
          case 'useDepositsHelper':
            updatedTemplate = updatedTemplate.replace(
              regexDeposits,
              `return helpers.deposits({
                  protocolToken: await this.getProtocolToken(protocolTokenAddress),
                  filter: { fromBlock, toBlock, userAddress },
                  provider: this.provider,
                })`,
            )
            break
          default:
            updatedTemplate = updatedTemplate.replace(
              regexDeposits,
              'throw new NotImplementedError()',
            )
            break
        }
      }
      return updatedTemplate
    },
  },
  UNWRAP: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, updatedTemplate: string): string => {
      if (outcomes.unwrap) {
        const regex = new RegExp('return Replacements.UNWRAP.placeholder', 'g')

        switch (outcomes.unwrap) {
          case 'useOneToOneMethod':
            updatedTemplate = updatedTemplate.replace(
              regex,
              `return helpers.unwrapOneToOne({
                  protocolToken: await this.getProtocolToken(_input.protocolTokenAddress),
                  underlyingTokens: await this.getUnderlyingTokens(_input.protocolTokenAddress)
                })`,
            )
            break
          default:
            updatedTemplate = updatedTemplate.replace(
              regex,
              'throw new NotImplementedError()',
            )
            break
        }
      }
      return updatedTemplate
    },
  },
  ASSET_TYPE: {
    placeholder: EMPTY_VALUE_FOR_BLANK_ADAPTER_HOOK,
    replace: (outcomes: Outcomes, updatedTemplate: string): string => {
      if (outcomes.defiAssetStructure) {
        const regex = new RegExp(
          'return Replacements.ASSET_TYPE.placeholder',
          'g',
        )

        switch (outcomes.defiAssetStructure) {
          case 'singleProtocolToken' || 'multipleProtocolTokens':
            updatedTemplate = updatedTemplate.replace(
              regex,
              `AssetType.StandardErc20`,
            )
            break

          default:
            updatedTemplate = updatedTemplate.replace(
              regex,
              `AssetType.NonStandardErc20`,
            )
            break
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
            updatedTemplate = updatedTemplate.replace(
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
            updatedTemplate = updatedTemplate.replace(regexRewardPositions, '')

            break
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
            updatedTemplate = updatedTemplate.replace(
              regexGetWithdrawalsFunctionName,
              `getWithdrawalsWithoutRewards`,
            )
            updatedTemplate = updatedTemplate.replace(
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
            updatedTemplate = updatedTemplate.replace(
              regexRewardWithdrawals,
              '',
            )
            break
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
            updatedTemplate = updatedTemplate.replace(
              regexGetPositionsFunctionName,
              `getPositionsWithoutRewards`,
            )
            updatedTemplate = updatedTemplate.replace(
              /implements/g,
              `extends RewardsAdapter implements`,
            )
            updatedTemplate = updatedTemplate.replace(
              /this.provider = provider/g,
              `super()
                this.provider = provider`,
            )

            break
          default:
            break
        }
      }
      return updatedTemplate
    },
  },
} as const
