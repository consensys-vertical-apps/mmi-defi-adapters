import { z } from 'zod'
import { logger } from './core/utils/logger'

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
            process.env.DEFI_ADAPTERS_PROVIDER_BSC || 'https://bscrpc.com',
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
            process.env.DEFI_ADAPTERS_PROVIDER_BASE || 'https://1rpc.io/base',
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
    enableUsdPricesOnPositions: z
      .boolean()
      .default(
        process.env.DEFI_ADAPTERS_ENABLE_USD_PRICES_FOR_POSITIONS !== 'false',
      ),
    rpcCallTimeoutInMs: z
      .number()
      .default(
        Number(process.env.DEFI_ADAPTERS_RPC_CALL_TIMEOUT_IN_MS) || 20000,
      ),
    rpcCallRetries: z
      .number()
      .default(Number(process.env.DEFI_ADAPTERS_RPC_CALL_RETRIES) || 1),
  })
  .default({})

export type IConfig = z.infer<typeof ConfigSchema>

export class Config {
  private config: IConfig

  constructor(config?: Partial<IConfig>) {
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
