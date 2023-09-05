import 'dotenv/config'
import { Protocol } from '../adapters'
import { protocolMetadataBuilders } from '../adapters/metadataBuilders'

const buildMetadata = async ({ protocolId }: { protocolId?: Protocol }) => {
  const metadataBuilders = Object.entries(protocolMetadataBuilders)
    .filter(
      ([supportedProtocolId, _]) =>
        !protocolId || protocolId === supportedProtocolId,
    )
    .flatMap(([_, supportedChains]) => {
      return Object.values(supportedChains)
    })

  // Runs sequentially so that it doesn't overwhelm the RPC provider
  for (const metadataBuilder of metadataBuilders) {
    await metadataBuilder()
  }
}

buildMetadata({})
