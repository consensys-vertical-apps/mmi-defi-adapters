import { Command } from 'commander'
import { Protocol, supportedProtocols } from '../adapters'
import { Chain } from '../core/constants/chains'
import { chainProviders } from '../core/utils/chainProviders'
import { logger } from '../core/utils/logger'
import { IMetadataBuilder } from '../core/utils/metadata'
import { IProtocolAdapter } from '../types/adapter'

export function buildMetadata(program: Command) {
  program
    .command('build-metadata')
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async ({ protocol, chain }) => {
      const protocolEntry = Object.entries(Protocol).find(
        ([key, value]) => key === protocol || value === protocol,
      )?.[1]

      const chainEntry = Object.entries(Chain).find(
        ([key, value]) => key === chain || value === Number(chain),
      )?.[1]

      for (const [protocolIdString, supportedChains] of Object.entries(
        supportedProtocols,
      )) {
        const protocolId = protocolIdString as Protocol
        if (protocolEntry && protocolEntry !== protocolId) {
          continue
        }

        for (const [chainIdString, adapterClasses] of Object.entries(
          supportedChains,
        )) {
          const chainId = +chainIdString as Chain
          if (chainEntry && chainEntry !== chainId) {
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
              logger.info(
                { protocolId, chainId, adapter: adapterClass.name },
                'FETCHING METADATA',
              )
              await adapter.buildMetadata()
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
