// TODO Check if any key in T is 'getPositions'
// - if not, call GetPositionsOptions<value>
// - if yes, add value to the output
// type GetPositionsOptions<T, Value = 'getPositions', Output = []> =

export const questionsJson = {
  appName: {
    question: 'Enter the name of your app.',
    type: 'text',
    next: 'appId',
  },
  appId: {
    question: 'Enter an ID for your app.',
    type: 'text',
    next: 'productId',
    outcomes: undefined,
  },
  productId: {
    question: 'Enter a product ID for your app',
    type: 'text',
    next: 'chainIds',
    outcomes: undefined,
  },
  chainIds: {
    question: 'Select the chains the product is on',
    type: 'checkbox',
    choices: ['Ethereum', 'Polygon'],
    next: 'forkCheck',
    outcomes: undefined,
  },
  forkCheck: {
    question:
      "Is your product a fork of one of the following? Please select from the list below or enter 'No' if none apply.",
    type: 'list',
    choices: ['No', 'Uniswap v2', 'Curve governance vesting', 'Compound v2'],
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
    next: {
      'Single token (Lido)': 'erc20Event',
      'Multiple tokens (Aave, Compound)': 'erc20Event',
      'Non fungible token (Uniswap V3)': 'balanceQueryMethod',
      'Contract position (Morpho)': 'balanceQueryMethod',
      Other: 'erc20Event',
    },
    outcomes: {
      'Single token (Lido)': {
        buildMetadataFunction: 'singleProtocolToken',
        defiAssetStructure: 'singleProtocolToken',
      },
      'Multiple tokens (Aave, Compound)': {
        buildMetadataFunction: 'multipleProtocolTokens',
        defiAssetStructure: 'multipleProtocolTokens',
      },
      'Non fungible token (Uniswap V3)': {
        buildMetadataFunction: 'notImplementedError',
        withdrawalsFunction: 'notImplementedError',
        depositsFunction: 'notImplementedError',
        defiAssetStructure: 'nft',
      },
      'Contract position (Morpho)': {
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
    question:
      'Can ERC20 transfer mint and burn events be used to determine deposits and withdrawals',
    type: 'confirm',
    next: 'balanceQueryMethod',
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
      '1 (Lido)': 'unwrapSimpleMapping',
      'More than 1 (Curve, GMX. Uniswap)': 'additionalRewards',
    },
    outcomes: {
      true: {
        underlyingTokens: 'multiple',
      },
      false: {
        underlyingTokens: 'single',
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
        rewards: 'addRewards',
      },
      false: {
        rewards: 'noRewards',
      },
    },
  },
} as const
