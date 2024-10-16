import type { Command } from 'commander'
import type { Protocol } from '../adapters/protocols.js'
import { supportedProtocols } from '../adapters/supportedProtocols.js'
import type { AdaptersController } from '../core/adaptersController.js'
import type { Chain } from '../core/constants/chains.js'
import { ProviderMissingError } from '../core/errors/errors.js'
import type { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider.js'
import { logger } from '../core/utils/logger.js'

export function checkMetadataType(
  program: Command,
  chainProviders: Record<Chain, CustomJsonRpcProvider>,
  adaptersController: AdaptersController,
) {
  program
    .command('check-metadata-type')

    .showHelpAfterError()
    .action(async () => {
      const dbAdapters = []
      const other = []
      for (const [protocolIdKey, supportedChains] of Object.entries(
        supportedProtocols,
      )) {
        const protocolId = protocolIdKey as Protocol

        for (const [chainIdKey, _] of Object.entries(supportedChains)) {
          const chainId = +chainIdKey as Chain

          const provider = chainProviders[chainId]

          if (!provider) {
            logger.error({ chainId }, 'No provider found for chain')
            throw new ProviderMissingError(chainId)
          }

          const chainProtocolAdapters =
            adaptersController.fetchChainProtocolAdapters(chainId, protocolId)

          for (const [_, adapter] of chainProtocolAdapters) {
            // Check which decoration is applied or use default
            //@ts-ignore
            if (adapter.getProtocolTokens.isCacheToDbDecorated) {
              dbAdapters.push({
                productId: adapter.productId,
                protocolId,
              })
              //@ts-ignore
            } else {
              other.push({
                productId: adapter.productId,
                protocolId,
              })
            }
          }
        }
      }

      // Remove duplicates from all lists
      const uniqueDbAdapters = uniqueAdapters(dbAdapters)
      const uniqueOtherAdapters = uniqueAdapters(other)
      console.log('--- Cached Adapters Summary ---\n')

      // Log for Database Cached Adapters
      if (uniqueDbAdapters.length > 0) {
        console.log('Database Cached Adapters:')
        uniqueDbAdapters.forEach((adapter) => {
          console.log(
            `  Protocol ID: ${adapter.protocolId} - Product ID: ${adapter.productId}`,
          )
        })
        console.log(`  Total DB Adapters: ${uniqueDbAdapters.length}\n`)
      }

      // Log for Other Adapters
      if (uniqueOtherAdapters.length > 0) {
        console.log('No pool cache adapters:')
        uniqueOtherAdapters.forEach((adapter) => {
          console.log(
            `  Protocol ID: ${adapter.protocolId} - Product ID: ${adapter.productId}`,
          )
        })
        console.log(`  Total Other Adapters: ${uniqueOtherAdapters.length}\n`)
      }
    })
}

// Helper function to remove duplicates based on protocolId and productId
function uniqueAdapters(adapters: { protocolId: string; productId: string }[]) {
  const seen = new Set()
  return adapters.filter((adapter) => {
    const idCombo = `${adapter.protocolId}-${adapter.productId}`
    if (seen.has(idCombo)) {
      return false
    }
    seen.add(idCombo)
    return true
  })
}
