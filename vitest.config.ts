import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    workspace: [
      {
        test: {
          name: 'adapters-unit',
          include: ['packages/adapters-library/**/*.test.ts'],
          exclude: [
            'packages/adapters-library/src/adapters/snapshots.test.ts',
            'packages/adapters-library/src/tests/*.test.ts',
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
      exclude: ['packages/adapters-library/src/**/contracts/**', '**/dist/**'],
    },
  },
})
