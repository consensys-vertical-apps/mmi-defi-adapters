import { protocolMetadataBuilders } from '../adapters/metadataBuilders'
import { Protocol } from '../adapters'
import { Command } from 'commander'

export function buildMetadata(program: Command) {
  program
    .command('build-metadata')
    .argument('[protocol]', 'Protocol filter')
    .showHelpAfterError()
    .action(async (protocolFilter: string) => {
      const protocol = Object.entries(Protocol).find(
        ([key, _]) => key === protocolFilter,
      )

      const metadataBuilders = Object.entries(protocolMetadataBuilders)
        .filter(
          ([supportedProtocolId, _]) =>
            !protocol || protocol[1] === supportedProtocolId,
        )
        .flatMap(([_, supportedChains]) => {
          return Object.values(supportedChains)
        })

      // Runs sequentially so that it doesn't overwhelm the RPC provider
      for (const metadataBuilder of metadataBuilders) {
        await metadataBuilder()
      }
    })
}
