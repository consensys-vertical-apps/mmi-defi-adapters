import { Command } from 'commander'
import { Protocol, supportedProtocols } from '../adapters'
import { Chain } from '../core/constants/chains'
import { chainProviders } from '../core/utils/chainProviders'
import { logger } from '../core/utils/logger'
import { IMetadataBuilder } from '../core/utils/metadata'
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

function isIMetadataBuilder(object: object): object is IMetadataBuilder {
  return (
    'buildMetadata' in object && typeof object['buildMetadata'] === 'function'
  )
}
