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
    '!src/scripts/**',
  ],
  setupFiles: ['dotenv/config'],
}

module.exports = config
