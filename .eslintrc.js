/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'prettier','unused-imports'],
  ignorePatterns: ["src/adapters/blank/blankTemplate/blankAdapterForCli/blankAdapter.ts"],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'prettier',
  ],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    'prettier/prettier': 'error',
    'arrow-body-style': 'off', // Disabled as per eslint-plugin-prettier recommendation
    'prefer-arrow-callback': 'off', // Disabled as per eslint-plugin-prettier recommendation

    // Disable the original rule
    '@typescript-eslint/no-unused-vars': 'off',

    // Add the auto-fixable rules from 'eslint-plugin-unused-imports'
    'unused-imports/no-unused-imports-ts': 'error',
    'unused-imports/no-unused-vars-ts': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],

    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'never',
      },
    ],
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
}
