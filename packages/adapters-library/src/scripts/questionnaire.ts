// TODO Check if any key in T is 'getPositions'
// - if not, call GetPositionsOptions<value>
// - if yes, add value to the output
// type GetPositionsOptions<T, Value = 'getPositions', Output = []> =

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
import { adapterClassName } from './newAdapter2Command'

// NEED TO ADD A QUESTION?
// 1. Add question below
// 2. Make sure you correctly implement next, if different path needed use an object for next
// 3. Outcomes are used in the replacement methods (see replacements.js) to add code snippets to blank template

export const answerToNextMap = {
  protocolKey: 'protocolId',
  protocolId: 'chainKeys',
  chainKeys: 'productId',
  productId: 'forkCheck',
  forkCheck: {
    No: 'defiAssetStructure',
    ...Object.keys(Templates).reduce((acc, templateName) => {
      return { [templateName]: 'end', ...acc }
    }, {}),
  },
  defiAssetStructure: {
    'Single ERC20 protocol token (Like stETH)': 'erc20Event',
    'Multiple ERC20 protocol tokens (Like Aave: aETH, aUSDC, Compound: cETH, cUSDC)': 'erc20Event',
    'Non fungible token (Like Uniswap V3)': 'balanceQueryMethod',
    'Contract position (Like Morpho)': 'balanceQueryMethod',
    Other: 'erc20Event',
  },
  erc20Event: 'balanceQueryMethod',
  balanceQueryMethod: 'underlyingTokens',
  underlyingTokens: {
    '1 (Like stEth, aETH)': 'unwrapOneUnderlying',
    'More than 1 (Like Curve.fi DAI/USDC/USDT)': 'unwrapMultipleUnderlying',
  },
  unwrapOneUnderlying: 'additionalRewards',
  unwrapMultipleUnderlying: 'additionalRewards',
  additionalRewards: {
    true: 'rewardsDetails',
    false: 'end',
  },
  rewardsDetails: 'end',
} as const;

export const answerToOutcomeMap = {
  defiAssetStructure: {
    'Single ERC20 protocol token (Like stETH)':  {
      buildMetadataFunction: 'singleProtocolToken',
      defiAssetStructure: 'singleProtocolToken',
    },
    'Multiple ERC20 protocol tokens (Like Aave: aETH, aUSDC, Compound: cETH, cUSDC)':
    {
      buildMetadataFunction: 'multipleProtocolTokens',
      defiAssetStructure: 'multipleProtocolTokens',
    },
    'Non fungible token (Like Uniswap V3)': {
      buildMetadataFunction: 'notImplementedError',
      withdrawalsFunction: 'notImplementedError',
      depositsFunction: 'notImplementedError',
      defiAssetStructure: 'nft',
    },
    'Contract position (Like Morpho)': {
      buildMetadataFunction: 'notImplementedError',
      withdrawalsFunction: 'notImplementedError',
      depositsFunction: 'notImplementedError',
      defiAssetStructure: 'contractPosition',
    },
    Other: {
      buildMetadataFunction: 'notImplementedError',
      withdrawalsFunction: 'notImplementedError',
      depositsFunction: 'notImplementedError',
      defiAssetStructure: 'other',
    },
  },
  erc20Event: {
    true: {
      withdrawalsFunction: 'useWithdrawalHelper',
      depositsFunction: 'useDepositsHelper',
    },
    false: {
      withdrawalsFunction: 'notImplementedError',
      depositsFunction: 'notImplementedError',
    },
  },
  balanceQueryMethod: {
    true: {
      getPositions: 'useBalanceOfHelper',
    },
    false: {
      getPositions: 'notImplementedError',
    },
  },
  underlyingTokens: {
    '1 (Like stEth, aETH)': {
      underlyingTokens: 'oneUnderlying',
    },
    'More than 1 (Like Curve.fi DAI/USDC/USDT)': {
      underlyingTokens: 'unwrapMultipleUnderlying',
    },
  },
  unwrapOneUnderlying: {
    'One-to-one mapping to the underlying asset': {
      unwrap: 'useUnwrapRatioMethod',
    },
    'Asset value derived from the total supply of the DeFi asset divided by the total of the underlying asset, where the underlying token is owned by the protocol token smart contract.':
    {
      unwrap: 'useUnwrapRatioMethod',
    },
    Other: {
      unwrap: 'notImplementedError',
    },
  },
  unwrapMultipleUnderlying: {
    'Asset value derived from the total supply of the DeFi asset divided by the total of the underlying assets, where underlying tokens are owned by the protocol token smart contract.':
    {
      unwrap: 'useUnwrapRatioMethod',
    },
    Other: {
      unwrap: 'notImplementedError',
    },
  },
  rewardDetails: {
    
      'Rewards are linked to defi asset (like curve and convex)': {
        hasRewards: true,
      },
      'Extra rewards are linked to defi asset (like curve permissionsless rewards':
        {
          hasExtraRewards: true,
        },
      "Protocol rewards like compound's protocol rewards": {
        hasProtocolRewards: true,
      }
  },
} as const

export const questionsJson = {
  protocolKey: {
    question: 'Enter the name of your protocol in PascalCase',
    type: 'text',
    next: answerToNextMap.productId,
    default: () => 'LenderV2',

    validate: (input: string) =>
      isPascalCase(input) || 'Value must be PascalCase',
  },
  protocolId: {
    question: 'Enter an ID for your protocol in kebab-case.',
    type: 'text',
    next: answerToNextMap.productId,
    default: ({ protocolKey }: { protocolKey: string }) =>
      protocolKey ? kebabCase(protocolKey) : 'lender-v2',
    validate: (input: string) =>
      isKebabCase(input) || 'Value must be kebab-case',
  },
  chainKeys: {
    question: 'Select the chains the product is on',
    type: 'checkbox',
    choices: Object.keys(Chain),
    default: () => {
      return [Object.keys(Chain)[0]] as (keyof typeof Chain)[]
    },
    next: answerToNextMap.chainKeys,
  },
  productId: {
    question: 'Enter a product ID for your product in kebab-case.',
    type: 'text',
    next: answerToNextMap.productId,
    default: () => 'farming',

    validateProductId: (defiProvider: DefiProvider, answers: Answers) => {
      return (productId: string) => {
        if (!isKebabCase(productId)) {
          return 'Value must be kebab-case'
        }

        if (!answers.protocolId) {
          return true
        }

        // Check if that productId already exists for that protocol
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
      }
    },
  },
  forkCheck: {
    question:
      "Is your product a fork of one of the following? Please select from the list below or enter 'No' if none apply.",
    type: 'list',
    choices: ['No', ...Object.keys(Templates)],
    default: () => 'No',
    next: answerToNextMap.forkCheck,
    outcomes: {
      No: { template: 'No' },
      ...Object.keys(Templates).reduce((acc, templateName) => {
        return { [templateName]: { template: templateName }, ...acc }
      }, {}),
    },
  },
  defiAssetStructure: {
    question:
      "What is the structure of your product's DeFi asset(s)? (Select from the list below)",
    type: 'list',
    default: () => 'Single ERC20 protocol token (Like stETH)',
    choices: Object.keys(answerToOutcomeMap.defiAssetStructure),
    next: answerToNextMap.defiAssetStructure,
    outcomes: answerToOutcomeMap.defiAssetStructure,
  },
  erc20Event: {
    question: `Can Mint and Burn Transfer event of your protocol's ERC20 token(s) be used to accurately track deposits into and withdrawals from the user's defi position?`,
    type: 'confirm',
    next: answerToNextMap.erc20Event,
    default: () => true,
    outcomes: answerToOutcomeMap.erc20Event,
  },
  balanceQueryMethod: {
    question:
      'Is the balanceOf(address) function used to query the asset balance in your product',
    type: 'confirm',
    next: answerToNextMap.balanceQueryMethod,
    default: () => true,
    outcomes: answerToOutcomeMap.balanceQueryMethod,
  },

  underlyingTokens: {
    question: 'How many underlying tokens does your DeFi asset represent?',
    type: 'list',
    default: () => '1 (Like stEth, aETH)',
    choices: Object.keys(answerToOutcomeMap.underlyingTokens),
    next: answerToOutcomeMap.underlyingTokens,
  },
  unwrapOneUnderlying: {
    question:
      'Regarding your DeFi token, how is its relationship to the underlying asset structured? Please select one of the following options',
    type: 'list',
    default: () => 'One-to-one mapping to the underlying asset',
    choices:Object.keys(answerToOutcomeMap.unwrapOneUnderlying),
    next: answerToNextMap.unwrapOneUnderlying,
    outcomes: answerToOutcomeMap.unwrapOneUnderlying,
  },
  unwrapMultipleUnderlying: {
    question:
      'Regarding your DeFi token, how is its relationship to the underlying assets structured? Please select one of the following options',
    type: 'list',
    default: () =>
      'Asset value derived from the total supply of the DeFi asset divided by the total of the underlying assets, where underlying tokens are owned by the protocol token smart contract.',
    choices: Object.keys(answerToOutcomeMap.unwrapMultipleUnderlying),
    next: answerToNextMap.unwrapMultipleUnderlying,
    outcomes: answerToOutcomeMap.unwrapMultipleUnderlying,
  },
  additionalRewards: {
    question:
      'Does your product offer additional rewards beyond the primary earnings? (Yes/No)',
    type: 'confirm',
    default: () => true,
    next: answerToNextMap.additionalRewards,
  },
  rewardsDetails: {
    question:
      'What best describes your rewards offering, you can select more than one',
    type: 'checkbox',
    choices: Object.keys(answerToOutcomeMap.rewardDetails),
    default: () => {
      return 'rewards linked to defi asset (like curve and convex)'
    },
    next: answerToNextMap.rewardsDetails,
    outcomes: answerToOutcomeMap.rewardDetails,
  },
} as const


