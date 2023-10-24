import convict, { Schema } from 'convict'

export interface IConfig {
  provider: {
    ethereum: string
    optimism: string
    bsc: string
    polygon: string
    fantom: string
    base: string
    arbitrum: string
    avalanche: string
    linea: string
  }
  useMulticallInterceptor: boolean
}

/**
 * Config class is responsible for managing the application configuration.
 * It can load configuration from a provided object.
 * Environment variables have the highest precedence and can override other settings.
 */
export class Config {
  private defaultConfig: Schema<IConfig>
  private config: convict.Config<IConfig>

  constructor(config?: Partial<IConfig>) {
    this.defaultConfig = {
      provider: {
        ethereum: {
          doc: 'Ethereum Provider URL',
          format: String,
          default:
            'https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          env: 'DEFI_ADAPTERS_PROVIDER_ETHEREUM',
        },
        optimism: {
          doc: 'Optimism Provider URL',
          format: String,
          default:
            'https://optimism-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          env: 'DEFI_ADAPTERS_PROVIDER_OPTIMISM',
        },
        bsc: {
          doc: 'BSC Provider URL',
          format: String,
          default: 'https://bscrpc.com',
          env: 'DEFI_ADAPTERS_PROVIDER_BSC',
        },
        polygon: {
          doc: 'Polygon Provider URL',
          format: String,
          default:
            'https://polygon-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          env: 'DEFI_ADAPTERS_PROVIDER_POLYGON',
        },
        fantom: {
          doc: 'Fantom Provider URL',
          format: String,
          default: 'https://rpc.ftm.tools',
          env: 'DEFI_ADAPTERS_PROVIDER_FANTOM',
        },
        base: {
          doc: 'Base Provider URL',
          format: String,
          default: 'https://1rpc.io/base',
          env: 'DEFI_ADAPTERS_PROVIDER_BASE',
        },
        arbitrum: {
          doc: 'Arbitrum Provider URL',
          format: String,
          default:
            'https://arbitrum-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          env: 'DEFI_ADAPTERS_PROVIDER_ARBITRUM',
        },
        avalanche: {
          doc: 'Avalanche Provider URL',
          format: String,
          default:
            'https://avalanche-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          env: 'DEFI_ADAPTERS_PROVIDER_AVALANCHE',
        },
        linea: {
          doc: 'Linea Provider URL',
          format: String,
          default:
            'https://linea-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
          env: 'DEFI_ADAPTERS_PROVIDER_LINEA',
        },
      },
      useMulticallInterceptor: {
        doc: 'Use Multicall Interceptor',
        format: Boolean,
        default: true,
        env: 'DEFI_ADAPTERS_USE_MULTICALL_INTERCEPTOR',
      },
    }

    this.config = convict(this.defaultConfig)

    if (config) {
      this.config.load(config)
    }

    this.config.validate({ allowed: 'strict' })
  }

  /**
   * Get the entire configuration as a typed object.
   * @returns The configuration object.
   */
  get values(): IConfig {
    return this.config.getProperties()
  }
}
