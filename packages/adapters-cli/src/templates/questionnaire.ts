import {
  isKebabCase,
  isPascalCase,
  pascalCase,
  Chain,
  type DefiProvider,
  type Protocol,
} from '@metamask-institutional/defi-adapters'
import type { Answers } from 'inquirer'
import { kebabCase } from 'lodash-es'
import { blankAdapterTemplate } from './blankAdapterTemplate.js'
import { compoundV2BorrowMarketForkAdapterTemplate } from './compoundV2BorrowMarketForkAdapter.js'
import { compoundV2SupplyMarketForkAdapterTemplate } from './compoundV2SupplyMarketForkAdapter.js'
import { uniswapV2PoolForkAdapterTemplate } from './uniswapV2PoolForkAdapter.js'
import { votingEscrowAdapterTemplate } from './votingEscrowAdapter.js'
import { writeOnlyDeFiAdapter } from './writeOnlyDeFiAdapter.js'

export const QuestionName = {
  ProtocolKey: 'protocolKey',
  ProtocolId: 'protocolId',
  AdapterClassName: 'adapterClassName',
  ChainKeys: 'chainKeys',
  ProductId: 'productId',
  ForkCheck: 'forkCheck',
  DefiAssetStructure: 'defiAssetStructure',
  Erc20Event: 'erc20Event',
  BalanceQueryMethod: 'balanceQueryMethod',
  UnderlyingTokens: 'underlyingTokens',
  UnwrapOneUnderlying: 'unwrapOneUnderlying',
  UnwrapMultipleUnderlying: 'unwrapMultipleUnderlying',
  AdditionalRewards: 'additionalRewards',
  RewardsDetails: 'rewardsDetails',
} as const

export type QuestionName = (typeof QuestionName)[keyof typeof QuestionName]

export const TemplateNames = {
  UniswapV2: 'UniswapV2PoolForkAdapter',
  CompoundSupply: 'CompoundV2 Supply Market',
  CompoundBorrow: 'CompoundV2 Borrow Market',
  VotingEscrow: 'VotingEscrowAdapter (like curve and stargate voting escrow)',
  WriteAdapterOnly:
    'WriteOnlyDeFiAdapter (supports only create transaction params, no getPositions features)',
  SmartBuilder: 'Smart Adapter Builder',
} as const

export type TemplateNames = (typeof TemplateNames)[keyof typeof TemplateNames]

export const Templates = {
  [TemplateNames.UniswapV2]: uniswapV2PoolForkAdapterTemplate,
  [TemplateNames.CompoundSupply]: compoundV2SupplyMarketForkAdapterTemplate,
  [TemplateNames.CompoundBorrow]: compoundV2BorrowMarketForkAdapterTemplate,
  [TemplateNames.VotingEscrow]: votingEscrowAdapterTemplate,
  [TemplateNames.WriteAdapterOnly]: writeOnlyDeFiAdapter,
  [TemplateNames.SmartBuilder]: blankAdapterTemplate,
} as const

export const QuestionAnswers = {
  [QuestionName.ForkCheck]: {
    ...TemplateNames,
  },
  [QuestionName.Erc20Event]: {
    true: true,
    false: false,
  },
  [QuestionName.BalanceQueryMethod]: {
    true: true,
    false: false,
  },
  [QuestionName.AdditionalRewards]: {
    true: true,
    false: false,
  },
  [QuestionName.DefiAssetStructure]: {
    Single: 'Single ERC20 protocol token (Like stETH)',
    Multiple:
      'Multiple ERC20 protocol tokens (Like Aave: aETH, aUSDC, Compound: cETH, cUSDC)',
    NonFungible: 'Non fungible token (Like Uniswap V3)',
    ContractPosition: 'Contract position (Like Morpho)',
    Other: 'Other',
  },
  [QuestionName.UnderlyingTokens]: {
    One: '1 (Like stEth, aETH)',
    Multiple: 'More than 1 (Like Curve.fi DAI/USDC/USDT)',
  },
  [QuestionName.UnwrapOneUnderlying]: {
    OneToOne: 'One-to-one mapping to the underlying asset',
    DerivedValue:
      'Asset value derived from the total supply of the DeFi asset divided by the total of the underlying asset, where the underlying token is owned by the protocol token smart contract.',
    Other: 'Other',
  },
  [QuestionName.UnwrapMultipleUnderlying]: {
    OneToOne: 'One-to-one mapping to the underlying asset',
    DerivedValue:
      'Asset value derived from the total supply of the DeFi asset divided by the total of the underlying assets, where underlying tokens are owned by the protocol token smart contract.',
    Other: 'Other',
  },
  [QuestionName.RewardsDetails]: {
    LinkedRewards: 'Rewards are linked to defi asset (like curve and convex)',
    ExtraRewards:
      'Extra rewards are linked to defi asset (like curve permissionsless rewards',
    ProtocolRewards: "Protocol rewards like compound's protocol rewards",
  },
} as const

export type QuestionAnswers = {
  productId: string
  protocolId: string
  protocolKey: string
  chainKeys: (keyof typeof Chain)[]
  forkCheck: (typeof QuestionAnswers)['forkCheck'][keyof (typeof QuestionAnswers)['forkCheck']]
  erc20Event: (typeof QuestionAnswers)['erc20Event'][keyof (typeof QuestionAnswers)['erc20Event']]
  balanceQueryMethod: (typeof QuestionAnswers)['balanceQueryMethod'][keyof (typeof QuestionAnswers)['balanceQueryMethod']]
  additionalRewards: (typeof QuestionAnswers)['additionalRewards'][keyof (typeof QuestionAnswers)['additionalRewards']]
  defiAssetStructure: (typeof QuestionAnswers)['defiAssetStructure'][keyof (typeof QuestionAnswers)['defiAssetStructure']]
  underlyingTokens: (typeof QuestionAnswers)['underlyingTokens'][keyof (typeof QuestionAnswers)['underlyingTokens']]
  unwrapOneUnderlying: (typeof QuestionAnswers)['unwrapOneUnderlying'][keyof (typeof QuestionAnswers)['unwrapOneUnderlying']]
  unwrapMultipleUnderlying: (typeof QuestionAnswers)['unwrapMultipleUnderlying'][keyof (typeof QuestionAnswers)['unwrapMultipleUnderlying']]
  rewardsDetails: (typeof QuestionAnswers)['rewardsDetails'][keyof (typeof QuestionAnswers)['rewardsDetails']][]
}

export const BlankAdapterOutcomeOptions = {
  getPositions: {
    useBalanceOfHelper: 'useBalanceOfHelper',
    notImplementedError: 'notImplementedError',
  },
  buildMetadataFunction: {
    singleProtocolToken: 'singleProtocolToken',
    multipleProtocolTokens: 'multipleProtocolTokens',
    notImplementedError: 'notImplementedError',
  },
  underlyingTokens: {
    oneUnderlying: 'oneUnderlying',
    multipleUnderlying: 'multipleUnderlying',
  },
  defiAssetStructure: {
    singleProtocolToken: 'singleProtocolToken',
    multipleProtocolTokens: 'multipleProtocolTokens',
    nft: 'nft',
    contractPosition: 'contractPosition',
    other: 'other',
  },
  unwrap: {
    useUnwrapOneToOneMethod: 'useUnwrapOneToOneMethod',
    useUnwrapRatioMethod: 'useUnwrapRatioMethod',
    notImplementedError: 'notImplementedError',
  },
  withdrawalsFunction: {
    useWithdrawalHelper: 'useWithdrawalHelper',
    notImplementedError: 'notImplementedError',
  },
  depositsFunction: {
    useDepositsHelper: 'useDepositsHelper',
    notImplementedError: 'notImplementedError',
  },
  hasRewards: {
    true: true,
    false: false,
  },
  hasExtraRewards: {
    true: true,
    false: false,
  },
  hasProtocolRewards: {
    true: true,
    false: false,
  },
} as const

export type BlankAdapterOutcomeOptions = {
  productId: string
  protocolId: string
  protocolKey: string
  chainKeys: (keyof typeof Chain)[]
  adapterClassName: string
  getPositions: (typeof BlankAdapterOutcomeOptions)['getPositions'][keyof (typeof BlankAdapterOutcomeOptions)['getPositions']]
  buildMetadataFunction: (typeof BlankAdapterOutcomeOptions)['buildMetadataFunction'][keyof (typeof BlankAdapterOutcomeOptions)['buildMetadataFunction']]
  underlyingTokens: (typeof BlankAdapterOutcomeOptions)['underlyingTokens'][keyof (typeof BlankAdapterOutcomeOptions)['underlyingTokens']]
  defiAssetStructure: (typeof BlankAdapterOutcomeOptions)['defiAssetStructure'][keyof (typeof BlankAdapterOutcomeOptions)['defiAssetStructure']]
  unwrap: (typeof BlankAdapterOutcomeOptions)['unwrap'][keyof (typeof BlankAdapterOutcomeOptions)['unwrap']]
  withdrawalsFunction: (typeof BlankAdapterOutcomeOptions)['withdrawalsFunction'][keyof (typeof BlankAdapterOutcomeOptions)['withdrawalsFunction']]
  depositsFunction: (typeof BlankAdapterOutcomeOptions)['depositsFunction'][keyof (typeof BlankAdapterOutcomeOptions)['depositsFunction']]
  hasRewards: (typeof BlankAdapterOutcomeOptions)['hasRewards'][keyof (typeof BlankAdapterOutcomeOptions)['hasRewards']]
  hasExtraRewards: (typeof BlankAdapterOutcomeOptions)['hasExtraRewards'][keyof (typeof BlankAdapterOutcomeOptions)['hasExtraRewards']]
  hasProtocolRewards: (typeof BlankAdapterOutcomeOptions)['hasProtocolRewards'][keyof (typeof BlankAdapterOutcomeOptions)['hasProtocolRewards']]
}

export const getQuestionnaire = (
  defiProvider: DefiProvider,
  answers: Answers,
) => {
  return {
    [QuestionName.ProtocolKey]: {
      name: QuestionName.ProtocolKey,
      message: 'Enter the name of your protocol in PascalCase',
      type: 'text',
      next: (_answer: string) => QuestionName.ProtocolId,
      default: () => 'LenderV2',
      validate: (input: string) =>
        isPascalCase(input) || 'Value must be PascalCase',
      outcomes: (input: string): Partial<BlankAdapterOutcomeOptions> => {
        return {
          [QuestionName.ProtocolKey]: input,
        }
      },
    },
    [QuestionName.ProtocolId]: {
      name: QuestionName.ProtocolId,
      message: 'Enter an ID for your protocol in kebab-case.',
      type: 'text',
      next: (_input: string) => QuestionName.ChainKeys,
      default: () =>
        answers.protocolKey ? kebabCase(answers.protocolKey) : 'lender-v2',
      validate: (input: string) =>
        isKebabCase(input) || 'Value must be kebab-case',
      outcomes: (input: string): Partial<BlankAdapterOutcomeOptions> => {
        return {
          [QuestionName.ProtocolId]: input,
        }
      },
    },
    [QuestionName.AdapterClassName]: {
      name: QuestionName.AdapterClassName,
      message: 'This question is skipped, auto created',
      type: 'text',
      default: () => 'skipped',
      next: () => 'skipped',
      outcomes: (): Partial<BlankAdapterOutcomeOptions> => {
        return {
          [QuestionName.AdapterClassName]: `${answers.protocolKey}${pascalCase(
            answers.productId,
          )}Adapter`,
        }
      },
    },
    [QuestionName.ChainKeys]: {
      name: QuestionName.ChainKeys,
      message: 'Select the chains the product is on',
      type: 'checkbox',
      choices: Object.keys(Chain),
      default: () => [Object.keys(Chain)[0]] as (keyof typeof Chain)[],
      next: (_input: string) => QuestionName.ProductId,
      outcomes: (
        input: (keyof typeof Chain)[],
      ): Partial<BlankAdapterOutcomeOptions> => {
        return {
          [QuestionName.ChainKeys]: input,
        }
      },
    },
    [QuestionName.ProductId]: {
      name: QuestionName.ProductId,
      message: 'Enter a product ID for your product in kebab-case.',
      type: 'text',
      next: (_input: string) => QuestionName.ForkCheck,
      default: () => 'farming',
      outcomes: (input: string): Partial<BlankAdapterOutcomeOptions> => {
        return {
          [QuestionName.ProductId]: input,
        }
      },
      validate: (productId: string) => {
        if (!isKebabCase(productId)) {
          return 'Value must be kebab-case'
        }
        if (!answers.protocolId) {
          return true
        }
        const productExists = answers.chainKeys.some(
          (chainKey: keyof typeof Chain) => {
            const chainId = Chain[chainKey as keyof typeof Chain]
            try {
              return defiProvider.adaptersController.fetchAdapter(
                chainId,
                answers.protocolId as Protocol,
                productId,
              )
            } catch (_) {
              return false
            }
          },
        )
        if (productExists) {
          return 'ProductId already exists for that Protocol and one of the chains selected'
        }
        return true
      },
    },
    [QuestionName.ForkCheck]: {
      name: QuestionName.ForkCheck,
      message:
        'Select one of the following templates, we recommend the smart builder.',
      type: 'list',
      choices: Object.values(TemplateNames).sort((a, b) => {
        if (a === 'Smart Adapter Builder') return -1
        if (b === 'Smart Adapter Builder') return 1
        return 0
      }),
      default: () => TemplateNames.SmartBuilder,
      next: (input: QuestionAnswers['forkCheck']) => {
        return input === QuestionAnswers['forkCheck'].SmartBuilder
          ? QuestionName.DefiAssetStructure
          : 'end'
      },
    },
    [QuestionName.DefiAssetStructure]: {
      name: QuestionName.DefiAssetStructure,
      message:
        "What is the structure of your product's DeFi asset(s)? (Select from the list below)",
      type: 'list',
      default: () => QuestionAnswers['defiAssetStructure'].Single as string,
      choices: Object.values(QuestionAnswers[QuestionName.DefiAssetStructure]),
      next: (input: QuestionAnswers['defiAssetStructure']) => {
        switch (input) {
          case QuestionAnswers['defiAssetStructure']['Single']:
          case QuestionAnswers['defiAssetStructure']['Multiple']:
          case QuestionAnswers['defiAssetStructure']['Other']:
            return QuestionName.Erc20Event
          case QuestionAnswers['defiAssetStructure']['NonFungible']:
          case QuestionAnswers['defiAssetStructure']['ContractPosition']:
            return QuestionName.BalanceQueryMethod
          default:
            return 'end'
        }
      },
      outcomes: (
        input: QuestionAnswers['defiAssetStructure'],
      ): Partial<BlankAdapterOutcomeOptions> => {
        switch (input) {
          case QuestionAnswers[QuestionName.DefiAssetStructure].Single:
            return {
              buildMetadataFunction: 'singleProtocolToken',
              defiAssetStructure: 'singleProtocolToken',
            }
          case QuestionAnswers[QuestionName.DefiAssetStructure].Multiple:
            return {
              buildMetadataFunction: 'multipleProtocolTokens',
              defiAssetStructure: 'multipleProtocolTokens',
            }
          case QuestionAnswers[QuestionName.DefiAssetStructure].NonFungible:
            return {
              buildMetadataFunction: 'notImplementedError',
              withdrawalsFunction: 'notImplementedError',
              depositsFunction: 'notImplementedError',
              defiAssetStructure: 'nft',
            }
          case QuestionAnswers[QuestionName.DefiAssetStructure]
            .ContractPosition:
            return {
              buildMetadataFunction: 'notImplementedError',
              withdrawalsFunction: 'notImplementedError',
              depositsFunction: 'notImplementedError',
              defiAssetStructure: 'contractPosition',
            }
          default:
            return {
              buildMetadataFunction: 'notImplementedError',
              withdrawalsFunction: 'notImplementedError',
              depositsFunction: 'notImplementedError',
              defiAssetStructure: 'other',
            }
        }
      },
    },
    [QuestionName.Erc20Event]: {
      name: QuestionName.Erc20Event,
      message:
        "Can Mint and Burn Transfer event of your protocol's ERC20 token(s) be used to accurately track deposits into and withdrawals from the user's defi position?",
      type: 'confirm',
      next: (_answer: string) => QuestionName.BalanceQueryMethod,
      default: () => true,
      outcomes: (
        input: QuestionAnswers['erc20Event'],
      ): Partial<BlankAdapterOutcomeOptions> => {
        if (input === QuestionAnswers[QuestionName.Erc20Event].true) {
          return {
            withdrawalsFunction:
              BlankAdapterOutcomeOptions.withdrawalsFunction
                .useWithdrawalHelper,
            depositsFunction:
              BlankAdapterOutcomeOptions.depositsFunction.useDepositsHelper,
          }
        }
        return {
          withdrawalsFunction:
            BlankAdapterOutcomeOptions.withdrawalsFunction.notImplementedError,
          depositsFunction:
            BlankAdapterOutcomeOptions.depositsFunction.notImplementedError,
        }
      },
    },
    [QuestionName.BalanceQueryMethod]: {
      name: QuestionName.BalanceQueryMethod,
      message:
        'Is the balanceOf(address) function used to query the asset balance in your product',
      type: 'confirm',
      next: (_answer: string) => QuestionName.UnderlyingTokens,
      default: () => true,
      outcomes: (
        input: QuestionAnswers['balanceQueryMethod'],
      ): Partial<BlankAdapterOutcomeOptions> => {
        if (input === QuestionAnswers[QuestionName.BalanceQueryMethod].true) {
          return {
            getPositions:
              BlankAdapterOutcomeOptions.getPositions.useBalanceOfHelper,
          }
        }
        return {
          getPositions:
            BlankAdapterOutcomeOptions.getPositions.notImplementedError,
        }
      },
    },
    [QuestionName.UnderlyingTokens]: {
      name: QuestionName.UnderlyingTokens,
      message: 'How many underlying tokens does your DeFi asset represent?',
      type: 'list',
      default: () => QuestionAnswers[QuestionName.UnderlyingTokens].One,
      choices: Object.values(QuestionAnswers[QuestionName.UnderlyingTokens]),
      next: (input: QuestionAnswers['underlyingTokens']) => {
        return input === QuestionAnswers['underlyingTokens']['One']
          ? QuestionName.UnwrapOneUnderlying
          : QuestionName.UnwrapMultipleUnderlying
      },
      outcomes: (
        input: QuestionAnswers['underlyingTokens'],
      ): Partial<BlankAdapterOutcomeOptions> => {
        if (input === QuestionAnswers['underlyingTokens']['One']) {
          return {
            underlyingTokens:
              BlankAdapterOutcomeOptions.underlyingTokens.oneUnderlying,
          }
        }
        return {
          underlyingTokens: 'multipleUnderlying',
        }
      },
    },
    [QuestionName.UnwrapOneUnderlying]: {
      name: QuestionName.UnwrapOneUnderlying,
      message:
        'Regarding your DeFi token, how is its relationship to the underlying asset structured? Please select one of the following options',
      type: 'list',
      default: () => QuestionAnswers[QuestionName.UnwrapOneUnderlying].OneToOne,
      choices: Object.values(QuestionAnswers[QuestionName.UnwrapOneUnderlying]),
      next: (_input: string) => QuestionName.AdditionalRewards,
      outcomes: (
        input: QuestionAnswers['unwrapOneUnderlying'],
      ): Partial<BlankAdapterOutcomeOptions> => {
        switch (input) {
          case QuestionAnswers[QuestionName.UnwrapOneUnderlying].OneToOne:
            return {
              unwrap: 'useUnwrapOneToOneMethod',
            }
          case QuestionAnswers[QuestionName.UnwrapOneUnderlying].DerivedValue:
            return {
              unwrap: 'useUnwrapRatioMethod',
            }
          default:
            return {
              unwrap: 'notImplementedError',
            }
        }
      },
    },
    [QuestionName.UnwrapMultipleUnderlying]: {
      name: QuestionName.UnwrapMultipleUnderlying,
      message:
        'Regarding your DeFi token, how is its relationship to the underlying assets structured? Please select one of the following options',
      type: 'list',
      default: () =>
        QuestionAnswers[QuestionName.UnwrapMultipleUnderlying].DerivedValue,
      choices: Object.values(
        QuestionAnswers[QuestionName.UnwrapMultipleUnderlying],
      ),
      next: (_input: string) => QuestionName.AdditionalRewards,
      outcomes: (
        input: QuestionAnswers['unwrapMultipleUnderlying'],
      ): Partial<BlankAdapterOutcomeOptions> => {
        switch (input) {
          case QuestionAnswers[QuestionName.UnwrapMultipleUnderlying].OneToOne:
            return {
              unwrap: 'useUnwrapOneToOneMethod',
            }
          case QuestionAnswers[QuestionName.UnwrapMultipleUnderlying]
            .DerivedValue:
            return {
              unwrap: 'useUnwrapRatioMethod',
            }
          default:
            return {
              unwrap: 'notImplementedError',
            }
        }
      },
    },

    [QuestionName.AdditionalRewards]: {
      name: QuestionName.AdditionalRewards,
      message:
        'Does your product offer additional rewards beyond the primary earnings? (Yes/No)',
      type: 'confirm',
      default: () => true,
      next: (input: QuestionAnswers['additionalRewards']) => {
        return input === QuestionAnswers[QuestionName.AdditionalRewards].true
          ? QuestionName.RewardsDetails
          : 'end'
      },
    },
    [QuestionName.RewardsDetails]: {
      name: QuestionName.RewardsDetails,
      message:
        'What best describes your rewards offering, you can select more than one',
      type: 'checkbox',
      choices: Object.values(QuestionAnswers[QuestionName.RewardsDetails]),
      default: () => QuestionAnswers[QuestionName.RewardsDetails].LinkedRewards,
      next: (_input: string) => 'end',

      outcomes: (
        input: QuestionAnswers['rewardsDetails'],
      ): Partial<BlankAdapterOutcomeOptions> => {
        const result: Partial<BlankAdapterOutcomeOptions> = {}

        if (input.includes(QuestionAnswers['rewardsDetails'].LinkedRewards)) {
          result.hasRewards = true
        }
        if (
          input.includes(
            QuestionAnswers[QuestionName.RewardsDetails].ExtraRewards,
          )
        ) {
          result.hasExtraRewards = true
        }
        if (
          input.includes(
            QuestionAnswers[QuestionName.RewardsDetails].ProtocolRewards,
          )
        ) {
          result.hasProtocolRewards = true
        }

        return result
      },
    },
  }
}
