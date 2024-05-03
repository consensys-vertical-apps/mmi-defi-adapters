import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { Json } from '../../types/json'
import { MetadataFiles, metadataKey } from '../metadata/AdapterMetadata'
import { logger } from '../utils/logger'

export interface IMetadataBuilder {
  buildMetadata(writeToFile?: boolean): Promise<Json>
}

export function CacheToFile({ fileKey }: { fileKey: string }) {
  return function actualDecorator(
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    originalMethod: any,
    _context: ClassMethodDecoratorContext,
  ) {
    async function replacementMethod(
      this: IMetadataBuilder & IProtocolAdapter,
      ...args: unknown[]
    ) {
      const writeToFile = args[0] as boolean
      if (writeToFile) {
        logger.info(
          {
            protocolId: this.protocolId,
            productId: this.productId,
            chainId: this.chainId,
            fileKey,
          },
          'Building metadata',
        )
        const metadataObject = await originalMethod.call(this, ...args)

        return {
          metadata: metadataObject,
          fileDetails: {
            protocolId: this.protocolId,
            productId: this.productId,
            chainId: this.chainId,
            fileKey,
          },
          // biome-ignore lint/suspicious/noExplicitAny: Decorator code
        } as any
      }

      const metadata = MetadataFiles.get(
        metadataKey({
          protocolId: this.protocolId,
          productId: this.productId,
          chainId: this.chainId,
          fileKey,
        }),
      )

      if (!metadata) {
        logger.error(
          {
            protocolId: this.protocolId,
            productId: this.productId,
            chainId: this.chainId,
            fileKey,
          },
          'Metadata file not found',
        )
        throw new Error('Metadata file not found')
      }

      return metadata
    }

    return replacementMethod
  }
}
