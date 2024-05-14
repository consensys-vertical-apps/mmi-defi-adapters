

import { Answers } from 'inquirer'
import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import {
  isKebabCase,
  isPascalCase,
  kebabCase,
} from '../core/utils/caseConversion'
import { DefiProvider } from '../defiProvider'

import { Templates } from './templates/templates'

export const QuestionName = {
  ProtocolKey: 'protocolKey',
  ProtocolId: 'protocolId',
  ChainKeys: 'chainKeys',
  ProductId: 'productId', // corrected from 'prodicyId'
  ForkCheck: 'forkCheck',
  DefiAssetStructure: 'defiAssetStructure',
  Erc20Event: 'erc20Event',
  BalanceQueryMethod: 'balanceQueryMethod',
  UnderlyingTokens: 'underlyingTokens',
  UnwrapOneUnderlying: 'unwrapOneUnderlying',
  UnwrapMultipleUnderlying: 'unwrapMultipleUnderlying',
  AdditionalRewards: 'additionalRewards',
  RewardsDetails: 'rewardsDetails', // corrected from 'rewardDetails'
} as const

export type QuestionName = (typeof QuestionName)[keyof typeof QuestionName]

type QuestionAnswersType = Omit<
  {
    [K in QuestionName]: { [key: string]: string }
  },
  'protocolKey' | 'protocolId' | 'chainKeys' | 'productId'
>

export const QuestionAnswers: QuestionAnswersType = {
  [QuestionName.ForkCheck]: {
    No: 'No',
    ...Object.keys(Templates).reduce((acc, templateName) => {
      return { [templateName]: templateName, ...acc }
    }, {}),
  },
  [QuestionName.Erc20Event]: {
    True: 'true',
    False: 'false',
  },
  [QuestionName.BalanceQueryMethod]: {
    True: 'true',
    False: 'false',
  },
  [QuestionName.AdditionalRewards]: {
    True: 'true',
    False: 'false',
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

export type DefiAssetStructureAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.DefiAssetStructure][keyof (typeof QuestionAnswers)[typeof QuestionName.DefiAssetStructure]]
export type UnderlyingTokensAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.UnderlyingTokens][keyof (typeof QuestionAnswers)[typeof QuestionName.UnderlyingTokens]]
export type UnwrapOneUnderlyingAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.UnwrapOneUnderlying][keyof (typeof QuestionAnswers)[typeof QuestionName.UnwrapOneUnderlying]]
export type UnwrapMultipleUnderlyingAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.UnwrapMultipleUnderlying][keyof (typeof QuestionAnswers)[typeof QuestionName.UnwrapMultipleUnderlying]]
export type RewardDetailsAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.RewardsDetails][keyof (typeof QuestionAnswers)[typeof QuestionName.RewardsDetails]]
export type ForkCheckAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.ForkCheck][keyof (typeof QuestionAnswers)[typeof QuestionName.ForkCheck]]
export type BalanceOfQueryMethodAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.BalanceQueryMethod][keyof (typeof QuestionAnswers)[typeof QuestionName.BalanceQueryMethod]]
export type AdditionalRewardsAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.AdditionalRewards][keyof (typeof QuestionAnswers)[typeof QuestionName.AdditionalRewards]]
export type Erc20EventAnswers =
  (typeof QuestionAnswers)[typeof QuestionName.Erc20Event][keyof (typeof QuestionAnswers)[typeof QuestionName.Erc20Event]]

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
    },
    [QuestionName.ChainKeys]: {
      name: QuestionName.ChainKeys,
      message: 'Select the chains the product is on',
      type: 'checkbox',
      choices: Object.keys(Chain),
      default: () => [Object.keys(Chain)[0]] as (keyof typeof Chain)[],
      next: (_input: string) => QuestionName.ProductId,
    },
    [QuestionName.ProductId]: {
      name: QuestionName.ProductId,
      message: 'Enter a product ID for your product in kebab-case.',
      type: 'text',
      next: (_input: string) => QuestionName.ForkCheck,
      default: () => 'farming',
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
        "Is your product a fork of one of the following? Please select from the list below or enter 'No' if none apply.",
      type: 'list',
      choices: ['No', ...Object.keys(Templates)],
      default: () => 'No',
      next: (input: ForkCheckAnswers) => {
        return input === QuestionAnswers[QuestionName.ForkCheck].No
          ? QuestionName.DefiAssetStructure
          : 'end'
      },
      outcomes: {
        No: { template: 'No' },
        ...Object.keys(Templates).reduce((acc, templateName) => {
          return { [templateName]: { template: templateName }, ...acc }
        }, {}),
      },
    },
    [QuestionName.DefiAssetStructure]: {
      name: QuestionName.DefiAssetStructure,
      message:
        "What is the structure of your product's DeFi asset(s)? (Select from the list below)",
      type: 'list',
      default: () =>
        QuestionAnswers[QuestionName.DefiAssetStructure].Single as string,
      choices: Object.values(QuestionAnswers[QuestionName.DefiAssetStructure]),
      next: (input: DefiAssetStructureAnswers) => {
        switch (input) {
          case QuestionAnswers[QuestionName.DefiAssetStructure].Single:
          case QuestionAnswers[QuestionName.DefiAssetStructure].Multiple:
          case QuestionAnswers[QuestionName.DefiAssetStructure].Other:
            return QuestionName.Erc20Event
          case QuestionAnswers[QuestionName.DefiAssetStructure].NonFungible:
          case QuestionAnswers[QuestionName.DefiAssetStructure]
            .ContractPosition:
            return QuestionName.BalanceQueryMethod
          default:
            return 'end'
        }
      },
      outcomes: (input: DefiAssetStructureAnswers) => {
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
          case QuestionAnswers[QuestionName.DefiAssetStructure].Other:
            return {
              buildMetadataFunction: 'notImplementedError',
              withdrawalsFunction: 'notImplementedError',
              depositsFunction: 'notImplementedError',
              defiAssetStructure: 'other',
            }
          default:
            return null
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
      outcomes: (input: Erc20EventAnswers) => {
        if (input === QuestionAnswers[QuestionName.Erc20Event].True) {
          return {
            withdrawalsFunction: 'useWithdrawalHelper',
            depositsFunction: 'useDepositsHelper',
          }
        }
        return {
          withdrawalsFunction: 'notImplementedError',
          depositsFunction: 'notImplementedError',
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
      outcomes: (input: BalanceOfQueryMethodAnswers) => {
        if (input === QuestionAnswers[QuestionName.BalanceQueryMethod].True) {
          return {
            getPositions: 'useBalanceOfHelper',
          }
        }
        return {
          getPositions: 'notImplementedError',
        }
      },
    },
    [QuestionName.UnderlyingTokens]: {
      name: QuestionName.UnderlyingTokens,
      message: 'How many underlying tokens does your DeFi asset represent?',
      type: 'list',
      default: () => QuestionAnswers[QuestionName.UnderlyingTokens].One,
      choices: Object.values(QuestionAnswers[QuestionName.UnderlyingTokens]),
      next: (input: UnderlyingTokensAnswers) => {
        return input === QuestionAnswers[QuestionName.UnderlyingTokens].One
          ? QuestionName.UnwrapOneUnderlying
          : QuestionName.UnwrapMultipleUnderlying
      },
      outcomes: (input: UnderlyingTokensAnswers) => {
        if (input === QuestionAnswers[QuestionName.UnderlyingTokens].One) {
          return {
            underlyingTokens: 'oneUnderlying',
          }
        }
        return {
          underlyingTokens: 'unwrapMultipleUnderlying',
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
      outcomes: (input: UnwrapOneUnderlyingAnswers) => {
        switch (input) {
          case QuestionAnswers[QuestionName.UnwrapOneUnderlying].OneToOne:
          case QuestionAnswers[QuestionName.UnwrapOneUnderlying].DerivedValue:
            return {
              unwrap: 'useUnwrapRatioMethod',
            }
          case QuestionAnswers[QuestionName.UnwrapOneUnderlying].Other:
            return {
              unwrap: 'notImplementedError',
            }
          default:
            return null
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
      outcomes: (input: UnwrapMultipleUnderlyingAnswers) => {
        switch (input) {
          case QuestionAnswers[QuestionName.UnwrapMultipleUnderlying]
            .DerivedValue:
            return {
              unwrap: 'useUnwrapRatioMethod',
            }
          case QuestionAnswers[QuestionName.UnwrapMultipleUnderlying].Other:
            return {
              unwrap: 'notImplementedError',
            }
          default:
            return null
        }
      },

    },

    [QuestionName.AdditionalRewards]: {
      name: QuestionName.AdditionalRewards,
      message:
        'Does your product offer additional rewards beyond the primary earnings? (Yes/No)',
      type: 'confirm',
      default: () => true,
      next: (input: AdditionalRewardsAnswers) => {
        return input === QuestionAnswers[QuestionName.AdditionalRewards].True
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
      default: () =>
        QuestionAnswers[QuestionName.RewardsDetails].LinkedRewards,
      next: (_input: string) => 'end',

      outcomes: (input: RewardDetailsAnswers) => {
        switch (input) {
          case QuestionAnswers[QuestionName.RewardsDetails].LinkedRewards:
            return {
              hasRewards: true,
            }
          case QuestionAnswers[QuestionName.RewardsDetails].ExtraRewards:
            return {
              hasExtraRewards: true,
            }
          case QuestionAnswers[QuestionName.RewardsDetails].ProtocolRewards:
            return {
              hasProtocolRewards: true,
            }
          default:
            return null
        }
      },
    },
  }
}
