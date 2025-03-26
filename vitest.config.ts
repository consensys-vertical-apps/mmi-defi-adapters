import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    workspace: [
      {
        test: {
          name: 'cli-unit',
          include: ['packages/adapters-cli/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'adapters-unit',
          include: ['packages/adapters-library/**/*.test.ts'],
          exclude: [
            'packages/adapters-library/src/adapters/integration.test.ts',
            'packages/adapters-library/src/tests/*.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'adapters-smoke',
          include: ['packages/adapters-library/src/tests/smoke.test.ts'],
          env: {
            DEFI_ADAPTERS_PROVIDER_BSC: '',
            DEFI_ADAPTERS_PROVIDER_FANTOM: '',
          },
        },
      },
      {
        test: {
          name: 'adapters-integration',
          include: [
            'packages/adapters-library/src/adapters/integration.test.ts',
          ],
        },
      },
    ],
  },
})
