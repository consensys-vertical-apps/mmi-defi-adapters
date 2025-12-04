import { promises as fs } from 'node:fs'
import { type Chain, DefiProvider, type Protocol } from '@codefi/defi-adapters'
import { supportedProtocols } from '@codefi/defi-adapters/dist/adapters/supportedProtocols.js'
import { Command } from 'commander'

export function checkDbTotalsCommand(program: Command) {
  program
    .command('check-db-totals')

    .showHelpAfterError()
    .action(async () => {
      const dbAdapters = []

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
            }
          }
        }
      }

      const outputLines: string[] = []

      outputLines.push('--- Cached Adapters Summary ---\n')

      // Log for Database Cached Adapters
      if (dbAdapters.length > 0) {
        outputLines.push('Database Pool totals Adapters:')
        let totalPools = 0
        dbAdapters.forEach((adapter) => {
          outputLines.push(
            ` ChainId: ${adapter.chainId} Protocol ID: ${adapter.protocolId} Product ID: ${adapter.productId} Total Pools: ${adapter.totalNumberOfPools}`,
          )
          totalPools += adapter.totalNumberOfPools
        })
        outputLines.push(`  Total Pools Adapters: ${totalPools}\n`)
      }
      if (dbAdapters.length > 0) {
        outputLines.push('Adapters with zero pools 0:')
        dbAdapters.forEach((adapter) => {
          if (adapter.totalNumberOfPools === 0) {
            outputLines.push(
              ` ChainId: ${adapter.chainId}  Protocol ID: ${adapter.protocolId} Product ID: ${adapter.productId} Total Pools: ${adapter.totalNumberOfPools}`,
            )
          }
        })
      }

      const outputPath = './db-totals-summary.txt'
      await fs.writeFile(outputPath, outputLines.join('\n'), 'utf-8')
      console.log(`Results written to ${outputPath}`)
    })
}
