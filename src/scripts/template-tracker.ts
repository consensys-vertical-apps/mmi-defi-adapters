import { QuestionConfig } from './newAdapter2Command'

export const questionsJson: Record<string, QuestionConfig> = {
  appName: {
    question: 'Please enter the name of your app.',
    type: 'text',
    next: 'appId',
  },
  appId: {
    question: 'Please enter an ID for your app.',
    type: 'text',
    next: 'productId',
    outcomes: undefined,
  },
  productId: {
    question: 'Please enter a product ID for your app',
    type: 'text',
    next: 'forkCheck',
    outcomes: undefined,
  },
  chainIds: {
    question: 'Please select the chains the product is on',
    type: 'checkbox',
    choices: ['Uniswap v2', 'Curve governance vesting', 'No'],
    next: 'forkCheck',
    outcomes: undefined,
  },
  forkCheck: {
    question:
      "Is your product a fork of one of the following? Please select from the list below or enter 'No' if none apply.",
    type: 'list',
    choices: ['Uniswap v2', 'Curve governance vesting', 'No'],
    next: {
      'Uniswap v2': 'end',
      'Curve governance vesting': 'end',
      No: 'defiAssetStructure',
    },
  },
  defiAssetStructure: {
    question:
      "What is the structure of your product's DeFi assets? (Select from the list below)",
    type: 'list',
    choices: [
      'Single token (Lido)',
      'Multiple tokens (Aave, Compound)',
      'Non fungible token (Uniswap V3)',
      'Contract position (Morpho)',
      'Other',
    ],
    next: 'balanceQueryMethod',
    outcomes: {
      'Single token (Lido)': {
        buildMetadataFunction: 'hardCoded',
        getPositionsImplementation: 'onePosition',
        withdrawalsFunction: 'useWithdrawalHelper',
        depositsFunction: 'useDepositsHelper',
      },
      'Multiple tokens (Aave, Compound)': {
        buildMetadataFunction: 'factoryContract',
        getPositionsImplementation: 'multiplePositions',
        withdrawalsFunction: 'useWithdrawalHelper',
        depositsFunction: 'useDepositsHelper',
      },
      'Non fungible token (Uniswap V3)': {
        buildMetadataFunction: 'notImplementedError',
        withdrawalsFunction: 'notImplementedError',
        depositsFunction: 'notImplementedError',
      },
      'Contract position (Morpho)': {
        buildMetadataFunction: 'notImplementedError',
        withdrawalsFunction: 'notImplementedError',
        depositsFunction: 'notImplementedError',
      },
      Other: {
        buildMetadataFunction: 'notImplementedError',
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
    choices: ['1 (Lido)', 'More than 1 (Curve, GMX. Uniswap)'],
    next: {
      '1 (Lido)': 'additionalRewards',
      'More than 1 (Curve, GMX)': 'additionalRewards',
    },
    outcomes: {
      true: {
        getUnderlying: 'useArray',
      },
      false: {
        getUnderlying: 'useObject',
      },
    },
  },
  unwrapSimpleMapping: {
    question: 'Is your defi token mapped one to one to the underlying token',
    type: 'confirm',
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
    next: 'end',
    outcomes: {
      true: {
        rewards: true,
      },
      false: {
        rewards: false,
      },
    },
  },
}
