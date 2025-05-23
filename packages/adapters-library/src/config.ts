import { z } from 'zod'
import { Chain, ChainName } from './core/constants/chains'
import { logger } from './core/utils/logger'
import { DeepPartial } from './types/deepPartial'

const CHAIN_NOT_ENABLED = ''

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
    CHAIN_NOT_ENABLED,
    'https://bsc-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  matic: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_POLYGON,
    'https://polygon-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  ),
  ftm: parseStringEnv(CHAIN_NOT_ENABLED, 'https://rpc.ftm.tools'),
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
  solana: parseStringEnv(
    process.env.DEFI_ADAPTERS_PROVIDER_SOLANA,
    'https://api.mainnet-beta.solana.com',
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
  solana: 1, // TODO Not relevant, find a way to remove this
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
  solana: false, // TODO Not relevant, find a way to remove this
}

const ConfigSchema = z
  .object({
    provider: z
      .object({
        [ChainName[Chain.Ethereum]]: z.string().default(providers.ethereum),
        [ChainName[Chain.Optimism]]: z.string().default(providers.op),
        [ChainName[Chain.Bsc]]: z.string().default(providers.bsc),
        [ChainName[Chain.Polygon]]: z.string().default(providers.matic),
        [ChainName[Chain.Fantom]]: z.string().default(providers.ftm),
        [ChainName[Chain.Base]]: z.string().default(providers.base),
        [ChainName[Chain.Arbitrum]]: z.string().default(providers.arb),
        [ChainName[Chain.Avalanche]]: z.string().default(providers.avax),
        [ChainName[Chain.Linea]]: z.string().default(providers.linea),
        [ChainName[Chain.Solana]]: z.string().default(providers.solana),
      })
      .default(providers),
    useMulticallInterceptor: z
      .boolean()
      .default(
        parseBooleanEnv(process.env.DEFI_ADAPTERS_USE_MULTICALL_INTERCEPTOR),
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
        [ChainName[Chain.Ethereum]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.ethereum),
        [ChainName[Chain.Optimism]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.op),
        [ChainName[Chain.Bsc]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.bsc),
        [ChainName[Chain.Polygon]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.matic),
        [ChainName[Chain.Fantom]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.ftm),
        [ChainName[Chain.Base]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.base),
        [ChainName[Chain.Arbitrum]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.arb),
        [ChainName[Chain.Avalanche]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.avax),
        [ChainName[Chain.Linea]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.linea),
        [ChainName[Chain.Solana]]: z
          .boolean()
          .default(hasUnlimitedEthGethLogsBlockRangeLimit.solana),
      })
      .default(hasUnlimitedEthGethLogsBlockRangeLimit),
    maxBatchSize: z
      .object({
        [ChainName[Chain.Ethereum]]: z.number().default(maxBatchSize.ethereum),
        [ChainName[Chain.Optimism]]: z.number().default(maxBatchSize.op),
        [ChainName[Chain.Bsc]]: z.number().default(maxBatchSize.bsc),
        [ChainName[Chain.Polygon]]: z.number().default(maxBatchSize.matic),
        [ChainName[Chain.Fantom]]: z.number().default(maxBatchSize.ftm),
        [ChainName[Chain.Base]]: z.number().default(maxBatchSize.base),
        [ChainName[Chain.Arbitrum]]: z.number().default(maxBatchSize.arb),
        [ChainName[Chain.Avalanche]]: z.number().default(maxBatchSize.avax),
        [ChainName[Chain.Linea]]: z.number().default(maxBatchSize.linea),
        [ChainName[Chain.Solana]]: z.number().default(maxBatchSize.solana),
      })
      .default(maxBatchSize),
    useDatabase: z.boolean().default(true),
    disableEthersBatching: z.boolean().default(false),
    useAdaptersWithUserEventOnly: z
      .boolean()
      .default(process.env.USE_ADAPTERS_WITH_USER_EVENT_ONLY === 'true'),
    enableRpcCache: z
      .boolean()
      .default(process.env.ENABLE_RPC_CACHE === 'true'),
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
  // Uses defaultValue only if env is undefined
  return env ?? defaultValue
}

// TODO This function can have some unwanted behaviour if env is ''
function parseBooleanEnv(env: string | undefined): boolean {
  return env !== 'false'
}
