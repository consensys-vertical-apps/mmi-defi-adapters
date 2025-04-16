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
      reporter: ['text', 'lcov', 'html'],
      include: ['packages/*/src/**'],
      exclude: [
        'packages/adapters-library/src/**/contracts/**',
        'packages/adapters-library/src/tests/**',
        'packages/adapters-library/src/**/products/*/tests/**',
        'packages/dev-ui/**', // This code is not deployed
        'packages/adapters-cli/**', // This code is not deployed
        'packages/*/src/main.ts', // Do not cover main.ts
        'packages/*/src/index.ts', // Do not cover index.ts at root
        'packages/*/src/**/logger.ts', // Do not cover logger.ts
      ],
    },
  },
})
