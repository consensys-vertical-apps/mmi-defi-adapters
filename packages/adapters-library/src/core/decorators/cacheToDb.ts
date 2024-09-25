import { promises as fs } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { IProtocolAdapter, ProtocolToken } from '../../types/IProtocolAdapter'
import { Chain, ChainName } from '../constants/chains'
import { logger } from '../utils/logger'

import { Protocol } from '../../adapters/protocols'

export function CacheToDb() {
  return function actualDecorator(
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    originalMethod: any,
    _context: ClassMethodDecoratorContext,
  ) {
    async function replacementMethod(
      this: IProtocolAdapter,
      ...args: unknown[]
    ) {
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
        const metadataObject = await originalMethod.call(this, ...args)

        return {
          metadata: metadataObject,
          adapterDetails: {
            protocolId: this.protocolId,
            productId: this.productId,
            chainId: this.chainId,
          },
          // biome-ignore lint/suspicious/noExplicitAny: Decorator code
        } as any
      }

      const metadata = await this.helpers.metadataProvider.getMetadata({
        protocolId: this.protocolId,
        productId: this.productId,
        chainId: this.chainId,
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
}
