import { Command } from 'commander'
import { Protocol, supportedProtocols } from '../adapters'
import { Chain } from '../core/constants/chains'
import { chainProviders } from '../core/utils/chainProviders'
import { logger } from '../core/utils/logger'
import { IMetadataBuilder } from '../core/utils/metadata'
import { IProtocolAdapter } from '../types/adapter'
import { chainFilter, protocolFilter } from './filters'

export function buildMetadata(program: Command) {
  program
    .command('build-metadata')
    .option('-p, --protocol <protocol>', 'protocol filter (name or id)')
    .option('-c, --chain <chain>', 'chain filter (name or id)')
    .showHelpAfterError()
    .action(async ({ protocol, chain }) => {
      const filterProtocolId = protocolFilter(protocol)
      const filterChainId = chainFilter(chain)

      for (const [protocolIdString, supportedChains] of Object.entries(
        supportedProtocols,
      )) {
        const protocolId = protocolIdString as Protocol
        if (filterProtocolId && filterProtocolId !== protocolId) {
          continue
        }

        for (const [chainIdString, adapterClasses] of Object.entries(
          supportedChains,
        )) {
          const chainId = +chainIdString as Chain
          if (filterChainId && filterChainId !== chainId) {
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
