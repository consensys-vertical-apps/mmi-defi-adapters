import 'dotenv/config'
import { protocolMetadataBuilders } from '../adapters/metadataBuilders'
import { Protocol } from '../adapters'

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
