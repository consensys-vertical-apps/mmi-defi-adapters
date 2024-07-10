import { z } from 'zod'
import { logger } from './core/utils/logger'
import { DeepPartial } from './types/deepPartial'

const ConfigSchema = z
  .object({
    provider: z
      .object({
        ethereum: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_ETHEREUM ||
              'https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          ),
        optimism: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_OPTIMISM ||
              'https://optimism-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          ),
        bsc: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_BSC ||
              'https://bnbsmartchain-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          ),
        polygon: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_POLYGON ||
              'https://polygon-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          ),
        fantom: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_FANTOM ||
              'https://rpc.ftm.tools',
          ),
        base: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_BASE ||
              'https://base-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          ),
        arbitrum: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_ARBITRUM ||
              'https://arbitrum-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          ),
        avalanche: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_AVALANCHE ||
              'https://avalanche-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          ),
        linea: z
          .string()
          .default(
            process.env.DEFI_ADAPTERS_PROVIDER_LINEA ||
              'https://linea-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          ),
      })
      .default({}),
    useMulticallInterceptor: z
      .boolean()
      .default(process.env.DEFI_ADAPTERS_USE_MULTICALL_INTERCEPTOR !== 'false'),
    useGetAllTransferLogs: z
      .boolean()
      .default(process.env.DEFI_ADAPTERS_USE_GET_ALL_TRANSFER_LOGS !== 'false'),
    enableUsdPricesOnPositions: z
      .boolean()
      .default(
        process.env.DEFI_ADAPTERS_ENABLE_USD_PRICES_FOR_POSITIONS !== 'false',
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
      .default(process.env.DEFI_ADAPTERS_USE_FAILOVER !== 'false'),
    hasUnlimitedEthGethLogsBlockRangeLimit: z
      .object({
        ethereum: z.boolean().default(true),
        optimism: z.boolean().default(true),
        bsc: z.boolean().default(false),
        polygon: z.boolean().default(true),
        fantom: z.boolean().default(false),
        base: z.boolean().default(true),
        arbitrum: z.boolean().default(true),
        avalanche: z.boolean().default(true),
        linea: z.boolean().default(true),
      })
      .default({}),
    maxBatchSize: z
      .object({
        ethereum: z
          .number()
          .default(
            parseNumberEnv(
              process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_ETHEREUM,
              100,
            ),
          ),
        optimism: z
          .number()
          .default(
            parseNumberEnv(
              process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_OPTIMISM,
              20,
            ),
          ),
        bsc: z
          .number()
          .default(
            parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_BSC, 100),
          ),
        polygon: z
          .number()
          .default(
            parseNumberEnv(
              process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_POLYGON,
              100,
            ),
          ),
        fantom: z
          .number()
          .default(
            parseNumberEnv(
              process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_FANTOM,
              100,
            ),
          ),
        base: z
          .number()
          .default(
            parseNumberEnv(process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_BASE, 100),
          ),
        arbitrum: z
          .number()
          .default(
            parseNumberEnv(
              process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_ARBITRUM,
              5,
            ),
          ),
        avalanche: z
          .number()
          .default(
            parseNumberEnv(
              process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_AVALANCHE,
              100,
            ),
          ),
        linea: z
          .number()
          .default(
            parseNumberEnv(
              process.env.DEFI_ADAPTERS_MAX_BATCH_SIZE_ETHEREUM,
              100,
            ),
          ),
      })
      .default({}),
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
