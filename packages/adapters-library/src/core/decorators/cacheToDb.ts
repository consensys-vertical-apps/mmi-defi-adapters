import type { IProtocolAdapter } from '../../types/IProtocolAdapter.js'
import { logger } from '../utils/logger.js'

export function CacheToDb(
  // biome-ignore lint/suspicious/noExplicitAny: Decorator code
  originalMethod: any,
  _context: ClassMethodDecoratorContext,
) {
  async function replacementMethod(this: IProtocolAdapter, ...args: unknown[]) {
    const writeToDb = args[0] as boolean
    if (writeToDb) {
      logger.info(
        {
          protocolId: this.protocolId,
          productId: this.productId,
          chainId: this.chainId,
        },
        'Write to database',
      )

      return await originalMethod.call(this, ...args)
    }

    const metadata = await this.helpers.metadataProvider.getMetadata({
      protocolId: this.protocolId,
      productId: this.productId,
    })

    if (!metadata) {
      logger.error(
        {
          protocolId: this.protocolId,
          productId: this.productId,
          chainId: this.chainId,
        },
        'Metadata not found in db',
      )
      throw new Error('Metadata not found in db')
    }

    return metadata
  }
  // Mark the method as decorated with CacheToDb
  replacementMethod.isCacheToDbDecorated = true
  return replacementMethod
}
