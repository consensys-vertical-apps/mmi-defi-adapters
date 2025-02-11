import { BlankAdapterOutcomeOptions, QuestionAnswers } from './questionnaire'

export const Replacements = {
  GET_PROTOCOL_TOKENS: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      adapterCode: string,
    ): string => {
      const regex = /return Replacements.GET_PROTOCOL_TOKENS.placeholder/g
      switch (true) {
        case outcomes.buildMetadataFunction === 'singleProtocolToken' &&
          outcomes.underlyingTokens === 'oneUnderlying':
          return adapterCode.replace(
            regex,
            `
            const protocolToken = await this.helpers.getTokenMetadata('0x')

            const underlyingToken = await this.helpers.getTokenMetadata('0x')

            return [
              {
                ...protocolToken,
                underlyingTokens: [underlyingToken],
              },
            ]`,
          )

        case outcomes.buildMetadataFunction === 'singleProtocolToken' &&
          outcomes.underlyingTokens === 'multipleUnderlying':
          return adapterCode.replace(
            regex,
            `
            const protocolToken = await this.helpers.getTokenMetadata('0x')

            const underlyingTokens = await Promise.all(
              [
                '0x',
                '0x',
                // Ideally fetched on-chain
              ].map(async (address) =>
                this.helpers.getTokenMetadata(address),
              ),
            )

            return [
              {
                ...protocolToken,
                underlyingTokens,
              },
            ]`,
          )

        case outcomes.buildMetadataFunction === 'multipleProtocolTokens' &&
          outcomes.underlyingTokens === 'oneUnderlying':
          return adapterCode.replace(
            regex,
            `
            const protocolTokens = await Promise.all(
              [
                '0x',
                '0x',
                // Ideally fetched on-chain from factory contract
              ].map(async (address) =>
                this.helpers.getTokenMetadata(address),
              ),
            )

            return await Promise.all(
              protocolTokens.map(async (protocolToken) => {
                const underlyingToken = await this.helpers.getTokenMetadata(
                  '0x', // Ideally fetched on-chain
                )

                return {
                  ...protocolToken,
                  underlyingTokens: [underlyingToken],
                }
              }),
            )`,
          )

        case outcomes.buildMetadataFunction === 'multipleProtocolTokens' &&
          outcomes.underlyingTokens === 'multipleUnderlying':
          return adapterCode.replace(
            regex,
            `
            const protocolTokens = await Promise.all(
              [
                '0x',
                '0x',
                // Ideally fetched on-chain from factory contract
              ].map(async (address) =>
                this.helpers.getTokenMetadata(address),
              ),
            )

            return await Promise.all(
              protocolTokens.map(async (protocolToken) => {
                const underlyingTokens = await Promise.all(
                  [
                    '0x',
                    '0x',
                    // Ideally fetched on-chain
                  ].map(async (address) =>
                    this.helpers.getTokenMetadata(address),
                  ),
                )

                return {
                  ...protocolToken,
                  underlyingTokens,
                }
              }),
            )`,
          )

        default:
          return adapterCode.replace(regex, 'throw new NotImplementedError()')
      }
    },
  },
  GET_POSITIONS: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      _answers: QuestionAnswers,
    ): string => {
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
    },
  },
  GET_WITHDRAWALS: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      _answers: QuestionAnswers,
    ): string => {
      const regexWithdrawals =
        /return Replacements.GET_WITHDRAWALS.placeholder/g

      switch (outcomes.withdrawalsFunction) {
        case 'useWithdrawalHelper':
          return updatedTemplate.replace(
            regexWithdrawals,
            `return this.helpers.withdrawals({
                  protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
                  filter: { fromBlock, toBlock, userAddress }
                })`,
          )

        default:
          return updatedTemplate.replace(
            regexWithdrawals,
            'throw new NotImplementedError()',
          )
      }
    },
  },
  GET_DEPOSITS: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      _answers: QuestionAnswers,
    ): string => {
      const regexDeposits = /return Replacements.GET_DEPOSITS.placeholder/g

      switch (outcomes.depositsFunction) {
        case 'useDepositsHelper':
          return updatedTemplate.replace(
            regexDeposits,
            `return this.helpers.deposits({
                  protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
                  filter: { fromBlock, toBlock, userAddress }
                })`,
          )

        default:
          return updatedTemplate.replace(
            regexDeposits,
            'throw new NotImplementedError()',
          )
      }
    },
  },
  UNWRAP: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
    ): string => {
      const regex = /return Replacements.UNWRAP.placeholder/g

      switch (outcomes.unwrap) {
        case 'useUnwrapOneToOneMethod':
          return updatedTemplate.replace(
            regex,
            `return this.helpers.unwrapOneToOne({
                  protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
                  underlyingTokens: (await this.getProtocolTokenByAddress(protocolTokenAddress)).underlyingTokens,
                })`,
          )
        case 'useUnwrapRatioMethod':
          return updatedTemplate.replace(
            regex,
            `return this.helpers.unwrapTokenAsRatio({
                  protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
                  underlyingTokens: (await this.getProtocolTokenByAddress(protocolTokenAddress)).underlyingTokens,
                  blockNumber
                })`,
          )
        default:
          return updatedTemplate.replace(
            regex,
            'throw new NotImplementedError()',
          )
      }
    },
  },
  TVL: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
    ): string => {
      const regex = /return Replacements.TVL.placeholder/g

      switch (outcomes.defiAssetStructure) {
        case 'singleProtocolToken':
        case 'multipleProtocolTokens':
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
    },
  },
  PRODUCT_ID: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      answers: QuestionAnswers,
    ): string => {
      return updatedTemplate.replace(
        /Replacements.PRODUCT_ID.placeholder/g,
        answers.productId,
      )
    },
  },
  PROTOCOL_ID: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      answers: QuestionAnswers,
    ): string => {
      return updatedTemplate.replace(
        /{{Replacements.PROTOCOL_ID.placeholder}}/g,
        answers.protocolId,
      )
    },
  },
  PROTOCOL_KEY: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      answers: QuestionAnswers,
    ): string => {
      return updatedTemplate.replace(
        /Replacements.PROTOCOL_KEY.placeholder/g,
        answers.protocolKey,
      )
    },
  },
  ADAPTER_CLASS_NAME: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      answers: QuestionAnswers,
    ): string => {
      return updatedTemplate.replace(
        /ADAPTER_CLASS_NAME/g,
        outcomes.adapterClassName,
      )
    },
  },
  GET_REWARD_POSITIONS: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
    ): string => {
      const regexRewardPositions =
        /\/\/Replacements.GET_REWARD_POSITIONS.placeholder/g

      switch (outcomes.hasRewards) {
        case true:
          return updatedTemplate.replace(
            regexRewardPositions,
            `async getRewardPositions({
                  userAddress,
                  protocolTokenAddress,
                  blockNumber,
                  tokenId,
                }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
                  throw new NotImplementedError()
                }`,
          )

        default:
          return updatedTemplate.replace(regexRewardPositions, '')
      }
    },
  },
  GET_REWARD_WITHDRAWALS: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
    ): string => {
      const regexRewardWithdrawals = RegExp(
        /\/\/Replacements.GET_REWARD_WITHDRAWALS.placeholder/,
        'g',
      )

      switch (outcomes.hasRewards) {
        case true:
          return updatedTemplate.replace(
            regexRewardWithdrawals,
            `async getRewardWithdrawals({
                  userAddress,
                  protocolTokenAddress,
                }: GetEventsInput): Promise<MovementsByBlockReward[]> {
                  throw new NotImplementedError()
                }`,
          )

        default:
          return updatedTemplate.replace(regexRewardWithdrawals, '')
      }
    },
  },
  GET_EXTRA_REWARD_POSITIONS: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
    ): string => {
      const regexRewardPositions =
        /\/\/Replacements.GET_EXTRA_REWARD_POSITIONS.placeholder/g

      switch (outcomes.hasExtraRewards) {
        case true:
          return updatedTemplate.replace(
            regexRewardPositions,
            `async getExtraRewardPositions({
                  userAddress,
                  protocolTokenAddress,
                  blockNumber,
                  tokenId,
                }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
                  throw new NotImplementedError()
                }`,
          )

        default:
          return updatedTemplate.replace(regexRewardPositions, '')
      }
    },
  },
  GET_EXTRA_REWARD_WITHDRAWALS: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
    ): string => {
      const regexRewardWithdrawals = RegExp(
        /\/\/Replacements.GET_EXTRA_REWARD_WITHDRAWALS.placeholder/,
        'g',
      )

      switch (outcomes.hasExtraRewards) {
        case true:
          return updatedTemplate.replace(
            regexRewardWithdrawals,
            `async getExtraRewardWithdrawals({
                  userAddress,
                  protocolTokenAddress,
                }: GetEventsInput): Promise<MovementsByBlockReward[]> {
                  throw new NotImplementedError()
                }`,
          )

        default:
          return updatedTemplate.replace(regexRewardWithdrawals, '')
      }
    },
  },
  ENABLE_POSITION_DETECTION_BY_PROTOCOL_TOKEN_TRANSFER: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      answers: QuestionAnswers,
    ): string => {
      const regexDetectionSetting = RegExp(
        /Replacements.ENABLE_POSITION_DETECTION_BY_PROTOCOL_TOKEN_TRANSFER.placeholder/,
        'g',
      )

      switch (true) {
        case answers.erc20Event:
          return updatedTemplate.replace(regexDetectionSetting, `'Transfer'`)

        default:
          return updatedTemplate.replace(regexDetectionSetting, 'false')
      }
    },
  },
  INCLUDE_IN_UNWRAP: {
    replace: (
      outcomes: BlankAdapterOutcomeOptions,
      updatedTemplate: string,
      answers: QuestionAnswers,
    ): string => {
      const regexDetectionSetting = RegExp(
        /Replacements.INCLUDE_IN_UNWRAP.placeholder/,
        'g',
      )

      switch (true) {
        case answers.defiAssetStructure ===
          'Single ERC20 protocol token (Like stETH)':
        case answers.defiAssetStructure ===
          'Multiple ERC20 protocol tokens (Like Aave: aETH, aUSDC, Compound: cETH, cUSDC)':
          return updatedTemplate.replace(regexDetectionSetting, 'true')

        default:
          return updatedTemplate.replace(regexDetectionSetting, 'false')
      }
    },
  },
} as const
