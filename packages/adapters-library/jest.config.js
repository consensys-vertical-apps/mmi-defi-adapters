/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/contracts/**',
    '!src/adapters/**/contracts/**',
    '!src/**/*.test.ts',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
}

module.exports = config
