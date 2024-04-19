import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config({
  path: path.resolve('../lib/.env'),
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
]

const xxx = envs.reduce(
  (acc, env) => {
    acc[`process.env.${env}`] = JSON.stringify(process.env[env])
    return acc
  },
  {} as Record<string, string>,
)

console.log('AAAAAAAAAAAAA', xxx)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: xxx,
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
  server: {
    proxy: {
      // Proxying requests from /api to your target API
      '/mainnet': {
        target: 'https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mainnet/, ''),
      },
      '/foo': {
        target: 'https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/foo/, ''),
      },
      // '/foo': 'https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
    },
  },
})
