import {
  type Chain,
  DefiProvider,
  type Protocol,
} from '@metamask-institutional/defi-adapters'
import { supportedProtocols } from '@metamask-institutional/defi-adapters/dist/adapters/supportedProtocols.js'
import type { Command } from 'commander'

export function checkMetadataTypeCommand(program: Command) {
  program
    .command('check-metadata-type')
    .showHelpAfterError()
    .action(async () => {
      const dbAdapters = []
      const other = []

      const defiProvider = new DefiProvider()

      for (const [protocolIdKey, supportedChains] of Object.entries(
        supportedProtocols,
      )) {
        const protocolId = protocolIdKey as Protocol

        for (const [chainIdKey, _] of Object.entries(supportedChains)) {
          const chainId = +chainIdKey as Chain

          // if (
          //   (chainId !== Chain.Solana && !chainProviders[chainId]) ||
          //   (chainId === Chain.Solana && !solanaProvider)
          // ) {
          //   logger.error({ chainId }, 'No provider found for chain')
          //   throw new ProviderMissingError(chainId)
          // }

          const chainProtocolAdapters =
            defiProvider.adaptersController.fetchChainProtocolAdapters(
              chainId,
              protocolId,
            )

          for (const [_, adapter] of chainProtocolAdapters) {
            // Check which decoration is applied or use default
            //@ts-ignore
            if (adapter.getProtocolTokens.isCacheToDbDecorated) {
              dbAdapters.push({
                productId: adapter.productId,
                protocolId,
              })
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
