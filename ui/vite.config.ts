import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import { defineConfig } from 'vite'

dotenv.config()

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

// console.log(
//   'QQQQQ',
//   envs.reduce(
//     (acc, env) => ({
//       ...acc,
//       [`process.env.${env}`]: JSON.stringify(process.env[env]),
//     }),
//     {},
//   ),
// )

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { version: '2023-05' }],
        ],
      },
    }),
  ],
  define: envs.reduce(
    (acc, env) => ({
      ...acc,
      [`process.env.${env}`]: JSON.stringify(process.env[env]),
    }),
    {},
  ),
})

// DEFI_ADAPTERS_LOG_LEVEL=warn
// DEFI_ADAPTERS_LOG_PRETTY=true
// DEFI_ADAPTERS_USE_MULTICALL_INTERCEPTOR=false
// DEFI_ADAPTERS_PROVIDER_ETHEREUM=https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02
// DEFI_ADAPTERS_PROVIDER_OPTIMISM=https://optimism-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02
// DEFI_ADAPTERS_PROVIDER_BSC=https://bscrpc.com
// DEFI_ADAPTERS_PROVIDER_POLYGON=https://polygon-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02
// DEFI_ADAPTERS_PROVIDER_FANTOM=https://rpc.ftm.tools
// DEFI_ADAPTERS_PROVIDER_BASE=https://1rpc.io/base
// DEFI_ADAPTERS_PROVIDER_ARBITRUM=https://arbitrum-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02
// DEFI_ADAPTERS_PROVIDER_AVALANCHE=https://avalanche-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02
// DEFI_ADAPTERS_PROVIDER_LINEA=https://linea-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02
