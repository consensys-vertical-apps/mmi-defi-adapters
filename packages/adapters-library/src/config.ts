import { z } from 'zod'
import { ChainName } from './core/constants/chains'
import { logger } from './core/utils/logger'
import { DeepPartial } from './types/deepPartial'

const providers: Record<ChainName, string> = {
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

const maxBatchSize: Record<ChainName, number> = {
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

const hasUnlimitedEthGethLogsBlockRangeLimit: Record<ChainName, boolean> = {
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
        [ChainName.ethereum]: z.string().default(providers.ethereum),
        [ChainName.op]: z.string().default(providers.op),
        [ChainName.bsc]: z.string().default(providers.bsc),
        [ChainName.matic]: z.string().default(providers.matic),
        [ChainName.ftm]: z.string().default(providers.ftm),
        [ChainName.base]: z.string().default(providers.base),
        [ChainName.arb]: z.string().default(providers.arb),
        [ChainName.avax]: z.string().default(providers.avax),
        [ChainName.linea]: z.string().default(providers.linea),
      })
      .default(providers),
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
        [ChainName.ethereum]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.ethereum),
        [ChainName.op]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.op),
        [ChainName.bsc]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.bsc),
        [ChainName.matic]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.matic),
        [ChainName.ftm]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.ftm),
        [ChainName.base]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.base),
        [ChainName.arb]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.arb),
        [ChainName.avax]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.avax),
        [ChainName.linea]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.linea),
      })
      .default(hasUnlimitedEthGethLogsBlockRangeLimit),
    maxBatchSize: z
      .object({
        [ChainName.ethereum]: z.number().default(maxBatchSize.ethereum),
        [ChainName.op]: z.number().default(maxBatchSize.op),
        [ChainName.bsc]: z.number().default(maxBatchSize.bsc),
        [ChainName.matic]: z.number().default(maxBatchSize.matic),
        [ChainName.ftm]: z.number().default(maxBatchSize.ftm),
        [ChainName.base]: z.number().default(maxBatchSize.base),
        [ChainName.arb]: z.number().default(maxBatchSize.arb),
        [ChainName.avax]: z.number().default(maxBatchSize.avax),
        [ChainName.linea]: z.number().default(maxBatchSize.linea),
      })
      .default(maxBatchSize),
    useDatabase: z.boolean().default(true),
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
  // Uses defaultValue if empty string is passed
  return env || defaultValue
}

function parseBooleanEnv(env: string | undefined): boolean {
  return env !== 'false'
}
