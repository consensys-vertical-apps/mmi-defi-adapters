import { Command } from 'commander'
import { supportedProtocols } from '../adapters'
import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import { IMetadataBuilder } from '../core/decorators/cacheToFile'
import { chainProviders } from '../core/utils/chainProviders'
import { logger } from '../core/utils/logger'
import { IProtocolAdapter } from '../types/adapter'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'

export function buildMetadata(program: Command) {
  program
    .command('build-metadata')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .showHelpAfterError()
    .action(async ({ protocols, chains }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterChainIds = multiChainFilter(chains)

      for (const [protocolIdKey, supportedChains] of Object.entries(
        supportedProtocols,
      )) {
        const protocolId = protocolIdKey as Protocol
        if (filterProtocolIds && !filterProtocolIds.includes(protocolId)) {
          continue
        }

        for (const [chainIdKey, adapterClasses] of Object.entries(
          supportedChains,
        )) {
          const chainId = +chainIdKey as Chain
          if (filterChainIds && !filterChainIds.includes(chainId)) {
            continue
          }

          const provider = chainProviders[chainId]

          if (!provider) {
            logger.error({ chainId }, 'No provider found for chain')
            throw new Error('No provider found for chain')
          }

          for (const adapterClass of adapterClasses) {
            const adapter = new adapterClass({
              provider,
              chainId,
              protocolId,
            }) as IProtocolAdapter

            if (isIMetadataBuilder(adapter)) {
              await adapter.buildMetadata(true)
            }
          }
        }
      }
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIMetadataBuilder(value: any): value is IMetadataBuilder {
  return (
    typeof value === 'object' &&
    'buildMetadata' in value &&
    typeof value['buildMetadata'] === 'function'
  )
}
