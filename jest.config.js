/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/contracts/**',
    '!src/adapters/**/contracts/**',
  ],
}

module.exports = config
