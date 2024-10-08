import { existsSync } from 'node:fs'
import path, { resolve } from 'node:path'
import { cwd } from 'node:process'
import Database from 'better-sqlite3'
import type { Database as BetterSqlite3Database } from 'better-sqlite3'
import { z } from 'zod'
import { ChainNames } from './core/constants/chains'
import { logger } from './core/utils/logger'
import { DeepPartial } from './types/deepPartial'

const defaultProviders: Record<ChainNames, string> = {
  ethereum: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_ETHEREUM,
    'https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  op: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_OPTIMISM,
    'https://optimism-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  bsc: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_BSC,
    'https://bsc-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  matic: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_POLYGON,
    'https://polygon-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  ftm: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_FANTOM,
    'https://rpc.ftm.tools',
  ),
  base: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_BASE,
    'https://base-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  arb: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_ARBITRUM,
    'https://arbitrum-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  avax: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_AVALANCHE,
    'https://avalanche-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  linea: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_LINEA,
    'https://linea-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
}

const defaultMaxBatchSize: Record<ChainNames, number> = {
  ethereum: parseNumberEnv(
    process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_ETHEREUM,
    100,
  ),
  op: parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_OPTIMISM, 20),
  bsc: parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_BSC, 100),
  matic: parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_POLYGON, 100),
  ftm: parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_FANTOM, 100),
  base: parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_BASE, 100),
  arb: parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_ARBITRUM, 5),
  avax: parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_AVALANCHE, 100),
  linea: parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_LINEA, 100),
}

const defaultHasUnlimitedEthGethLogsBlockRangeLimit: Record<
  ChainNames,
  boolean
> = {
  ethereum: true,
  op: true,
  bsc: false,
  matic: true,
  ftm: false,
  base: true,
  arb: true,
  avax: true,
  linea: true,
}

const ConfigSchema = z
  .object({
    provider: z
      .object({
        [ChainNames.ethereum]: z.string(),
        [ChainNames.op]: z.string(),
        [ChainNames.bsc]: z.string(),
        [ChainNames.matic]: z.string(),
        [ChainNames.ftm]: z.string(),
        [ChainNames.base]: z.string(),
        [ChainNames.arb]: z.string(),
        [ChainNames.avax]: z.string(),
        [ChainNames.linea]: z.string(),
      })
      .default(defaultProviders),
    useMulticallInterceptor: z
      .boolean()
      .default(
        parseBooleanEnv(process.env.DEFI_ADAPTERS_USE_MULTICALL_INTERCEPTOR),
      ),
    useGetAllTransferLogs: z
      .boolean()
      .default(
        parseBooleanEnv(process.env.DEFI_ADAPTERS_USE_GET_ALL_TRANSFER_LOGS),
      ),
    enableUsdPricesOnPositions: z
      .boolean()
      .default(
        parseBooleanEnv(
          process.env.DEFI_ADAPTERS_ENABLE_USD_PRICES_FOR_POSITIONS,
        ),
      ),
    rpcCallTimeoutInMs: z
      .number()
      .default(
        parseNumberEnv(process.env.DEFI_ADAPTERS_RPC_CALL_TIMEOUT_IN_MS, 10000),
      ),
    rpcCallRetries: z
      .number()
      .default(parseNumberEnv(process.env.DEFI_ADAPTERS_RPC_CALL_RETRIES, 0)),
    rpcGetLogsTimeoutInMs: z
      .number()
      .default(
        parseNumberEnv(
          process.env.DEFI_ADAPTERS_RPC_GETLOGS_TIMEOUT_IN_MS,
          10000,
        ),
      ),
    rpcGetLogsRetries: z
      .number()
      .default(
        parseNumberEnv(process.env.DEFI_ADAPTERS_RPC_GETLOGS_RETRIES, 0),
      ),
    enableFailover: z
      .boolean()
      .default(parseBooleanEnv(process.env.DEFI_ADAPTERS_USE_FAILOVER)),
    hasUnlimitedEthGethLogsBlockRangeLimit: z
      .object({
        [ChainNames.ethereum]: z.boolean(),
        [ChainNames.op]: z.boolean(),
        [ChainNames.bsc]: z.boolean(),
        [ChainNames.matic]: z.boolean(),
        [ChainNames.ftm]: z.boolean(),
        [ChainNames.base]: z.boolean(),
        [ChainNames.arb]: z.boolean(),
        [ChainNames.avax]: z.boolean(),
        [ChainNames.linea]: z.boolean(),
      })
      .default(defaultHasUnlimitedEthGethLogsBlockRangeLimit),
    maxBatchSize: z
      .object({
        [ChainNames.ethereum]: z.number(),
        [ChainNames.op]: z.number(),
        [ChainNames.bsc]: z.number(),
        [ChainNames.matic]: z.number(),
        [ChainNames.ftm]: z.number(),
        [ChainNames.base]: z.number(),
        [ChainNames.arb]: z.number(),
        [ChainNames.avax]: z.number(),
        [ChainNames.linea]: z.number(),
      })
      .default(defaultMaxBatchSize),
  })
  .strict()
  .default({})

export type IConfig = z.infer<typeof ConfigSchema>

export class Config {
  private config: IConfig

  constructor(config?: DeepPartial<IConfig>) {
    const parsedConfig = ConfigSchema.safeParse(config)

    if (!parsedConfig.success) {
      logger.error(
        {
          message: parsedConfig.error.message,
          errors: parsedConfig.error.errors,
        },
        'Invalid configuration',
      )
      throw new Error('Invalid configuration')
    }

    this.config = parsedConfig.data
  }

  /**
   * Get the entire configuration as a typed object.
   * @returns The configuration object.
   */
  get values(): IConfig {
    return this.config
  }
}

function parseNumberEnv(env: string | undefined, defaultValue: number): number {
  return env ? Number(env) : defaultValue
}
function parseStringEnv(env: string | undefined, defaultValue: string): string {
  return env ?? defaultValue
}
function parseBooleanEnv(env: string | undefined): boolean {
  return env !== 'false'
}
