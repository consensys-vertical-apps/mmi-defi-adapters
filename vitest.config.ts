import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    workspace: [
      {
        test: {
          name: 'unit',
          include: [
            'packages/adapters-library/**/*.test.ts',
            'packages/adapters-api/**/*.test.ts',
            'packages/adapters-cli/**/*.test.ts',
            'packages/workers/**/*.test.ts',
          ],
          exclude: [
            'packages/adapters-library/src/adapters/snapshots.test.ts',
            'packages/adapters-library/src/tests/smoke.test.ts',
            'packages/adapters-cli/src/tests/new-adapter-templates.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'smoke',
          include: ['packages/adapters-library/src/tests/smoke.test.ts'],
          env: {
            DEFI_ADAPTERS_PROVIDER_BSC: '',
            DEFI_ADAPTERS_PROVIDER_FANTOM: '',
          },
        },
      },
      {
        test: {
          name: 'adapter-snapshots',
          include: ['packages/adapters-library/src/adapters/snapshots.test.ts'],
        },
      },
      {
        test: {
          name: 'template-snapshots',
          include: [
            'packages/adapters-cli/src/tests/new-adapter-templates.test.ts',
          ],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/adapters-library/src/**/contracts/**',
        'packages/dev-ui/**', // This code is not deployed
        'packages/adapters-cli/**', // This code is not deployed
      ],
    },
  },
})
