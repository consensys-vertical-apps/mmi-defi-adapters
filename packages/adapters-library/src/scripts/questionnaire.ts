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

// NEED TO ADD A QUESTION?
// 1. Add question below
// 2. Make sure you correctly implement next, if different path needed use an object for next
// 3. Outcomes are used in the replacement methods (see replacements.js) to add code snippets to blank template

export const questionsJson = {
  protocolKey: {
    question: 'Enter the name of your protocol in PascalCase',
    type: 'text',
    next: 'protocolId',
    default: () => 'LenderV2',

    validate: (input: string) =>
      isPascalCase(input) || 'Value must be PascalCase',
  },
  protocolId: {
    question: 'Enter an ID for your protocol in kebab-case.',
    type: 'text',
    next: 'chainKeys',
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
    next: 'productId',
  },
  productId: {
    question: 'Enter a product ID for your product in kebab-case.',
    type: 'text',
    next: 'forkCheck',
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
    choices: ['No', 'Uniswap v2', 'Curve governance vesting', 'Compound v2'],
    default: () => 'No',
    next: {
      No: 'defiAssetStructure',
      'Uniswap v2': 'end',
      'Curve governance vesting': 'end',
      'Compound v2': 'end',
    },
    outcomes: {
      'Uniswap v2': {
        template: 'UniswapV2',
      },
      'Curve governance vesting': {
        template: 'CurveGovernanceVesting',
      },
      'Compound v2': {
        template: 'CompoundV2',
      },
      No: { template: 'No' },
    },
  },
  defiAssetStructure: {
    question:
      "What is the structure of your product's DeFi asset(s)? (Select from the list below)",
    type: 'list',
    default: () => 'Single ERC20 protocol token (Like stETH)',
    choices: [
      'Single ERC20 protocol token (Like stETH)',
      'Multiple ERC20 protocol tokens (Like Aave: aETH, aUSDC, Compound: cETH, cUSDC)',
      'Non fungible token (Like Uniswap V3)',
      'Contract position (Like Morpho)',
      'Other',
    ],
    next: {
      'Single ERC20 protocol token (Like stETH)': 'erc20Event',
      'Multiple ERC20 protocol tokens (Like Aave: aETH, aUSDC, Compound: cETH, cUSDC)':
        'erc20Event',
      'Non fungible token (Like Uniswap V3)': 'balanceQueryMethod',
      'Contract position (Like Morpho)': 'balanceQueryMethod',
      Other: 'erc20Event',
    },
    outcomes: {
      'Single ERC20 protocol token (Like stETH)': {
        buildMetadataFunction: 'singleProtocolToken',
        defiAssetStructure: 'singleProtocolToken',
      },
      'Multiple ERC20 protocol tokens (Like Aave: aETH, aUSDC, Compound: cETH, cUSDC )':
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
  },
  erc20Event: {
    question: `Can Mint and Burn Transfer event of your protocol's ERC20 token(s) be used to accurately track deposits into and withdrawals from the user's defi position?`,
    type: 'confirm',
    next: 'balanceQueryMethod',
    default: () => true,
    outcomes: {
      true: {
        withdrawalsFunction: 'useWithdrawalHelper',
        depositsFunction: 'useDepositsHelper',
      },
      false: {
        withdrawalsFunction: 'notImplementedError',
        depositsFunction: 'notImplementedError',
      },
    },
  },
  balanceQueryMethod: {
    question:
      'Is the balanceOf(address) function used to query the asset balance in your product',
    type: 'confirm',
    next: 'underlyingTokens',
    default: () => true,
    outcomes: {
      true: {
        getPositions: 'useBalanceOfHelper',
      },
      false: {
        getPositions: 'notImplementedError',
      },
    },
  },

  underlyingTokens: {
    question: 'How many underlying tokens does your DeFi asset represent?',
    type: 'list',
    default: () => '1 (Like stEth)',
    choices: ['1 (Like stEth)', 'More than 1 (Like Curve.fi DAI/USDC/USDT)'],
    next: {
      '1 (Like stEth)': 'unwrapSimpleMapping',
      'More than 1 (Like Curve.fi DAI/USDC/USDT)': 'additionalRewards',
    },
    outcomes: {
      '1 (Like stEth)': {
        underlyingTokens: 'oneUnderlying',
      },
      'More than 1 (Like Curve.fi DAI/USDC/USDT)': {
        underlyingTokens: 'multipleUnderlying',
      },
    },
  },
  unwrapSimpleMapping: {
    question: 'Is your defi token mapped one to one to the underlying token',
    type: 'confirm',
    default: () => true,
    next: 'additionalRewards',
    outcomes: {
      true: {
        unwrap: 'useOneToOneMethod',
      },
      false: {
        unwrap: 'notImplementedError',
      },
    },
  },
  additionalRewards: {
    question:
      'Does your product offer additional rewards beyond the primary earnings? (Yes/No)',
    type: 'confirm',
    default: () => true,
    next: 'end',
    outcomes: {
      true: {
        rewards: 'addRewards',
      },
      false: {
        rewards: 'noRewards',
      },
    },
  },
} as const
