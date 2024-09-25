import { Command } from 'commander'

import { Protocol } from '../adapters/protocols'
import { supportedProtocols } from '../adapters/supportedProtocols'
import { AdaptersController } from '../core/adaptersController'
import { Chain } from '../core/constants/chains'

import { ProviderMissingError } from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'

import { logger } from '../core/utils/logger'
import { buildMetadata } from './buildMetadata'

export function checkDbTotals(
  program: Command,
  chainProviders: Record<Chain, CustomJsonRpcProvider>,
  adaptersController: AdaptersController,
) {
  program
    .command('check-db-totals')

    .showHelpAfterError()
    .action(async () => {
      const dbAdapters = []

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
              const totalNumberOfPools =
                await adapter.helpers.metadataProvider.getPoolCount(
                  protocolId,
                  adapter.productId,
                )

              dbAdapters.push({
                productId: adapter.productId,
                chainId,
                protocolId,
                totalNumberOfPools,
              })
              //@ts-ignore
            }
          }
        }
      }

      console.log('--- Cached Adapters Summary ---\n')

      // Log for Database Cached Adapters
      if (dbAdapters.length > 0) {
        console.log('Database Pool totals Adapters:')
        let totalPools = 0
        dbAdapters.forEach((adapter) => {
          console.log(
            ` ChainId ${adapter.chainId} Protocol ID: ${adapter.protocolId} - Product ID: ${adapter.productId} - Total Pools: ${adapter.totalNumberOfPools}`,
          )

          totalPools += adapter.totalNumberOfPools
        })
        console.log(`  Total Pools Adapters: ${totalPools}\n`)
      }
      if (dbAdapters.length > 0) {
        console.log('Adapters with zero pools 0:')

        dbAdapters.forEach((adapter) => {
          if (adapter.totalNumberOfPools === 0) {
            console.error(
              ` ChainId ${adapter.chainId}  Protocol ID: ${adapter.protocolId} - Product ID: ${adapter.productId} - Total Pools: ${adapter.totalNumberOfPools}`,
            )
          }
        })
      }
    })
}
