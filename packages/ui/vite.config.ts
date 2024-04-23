import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config({
  path: path.resolve('../../.env'),
})

const envs = [
  'DEFI_ADAPTERS_LOG_LEVEL',
  'DEFI_ADAPTERS_LOG_PRETTY',
  'DEFI_ADAPTERS_USE_MULTICALL_INTERCEPTOR',
  'DEFI_ADAPTERS_PROVIDER_ETHEREUM',
  'DEFI_ADAPTERS_PROVIDER_OPTIMISM',
  'DEFI_ADAPTERS_PROVIDER_BSC',
  'DEFI_ADAPTERS_PROVIDER_POLYGON',
  'DEFI_ADAPTERS_PROVIDER_FANTOM',
  'DEFI_ADAPTERS_PROVIDER_BASE',
  'DEFI_ADAPTERS_PROVIDER_ARBITRUM',
  'DEFI_ADAPTERS_PROVIDER_AVALANCHE',
  'DEFI_ADAPTERS_PROVIDER_LINEA',
  'DEFI_ADAPTERS_ENABLE_USD_PRICES_FOR_POSITIONS',
  'DEFI_ADAPTERS_RPC_CALL_TIMEOUT_IN_MS',
  'DEFI_ADAPTERS_RPC_CALL_RETRIES',
  'DEFI_ADAPTERS_RPC_GETLOGS_TIMEOUT_IN_MS',
  'DEFI_ADAPTERS_RPC_GETLOGS_RETRIES',
  'DEFI_ADAPTERS_USE_FAILOVER',
]

const projectEnvs = envs.reduce(
  (acc, env) => {
    acc[`process.env.${env}`] = JSON.stringify(process.env[env])
    return acc
  },
  {} as Record<string, string>,
)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: projectEnvs,
  optimizeDeps: {
    include: ['@metamask-institutional/defi-adapters'],
  },
  build: {
    commonjsOptions: {
      include: [/@metamask-institutional\/defi-adapters/, /node_modules/],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
