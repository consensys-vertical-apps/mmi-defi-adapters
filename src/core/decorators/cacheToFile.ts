import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { IProtocolAdapter } from '../../types/adapter.js'
import { ChainName } from '../constants/chains.js'
import { logger } from '../utils/logger.js'
import { IMetadataBuilder, writeMetadataToFile } from '../utils/metadata.js'

export function CacheToFile({ fileKey }: { fileKey: string }) {
  return function actualDecorator(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            product: this.product,
            chainId: this.chainId,
            fileKey,
          },
          'Building metadata',
        )
        const metadataObject = await originalMethod.call(this, ...args)

        await writeMetadataToFile({
          protocolId: this.protocolId,
          product: this.product,
          chainId: this.chainId,
          fileKey,
          metadataObject,
        })

        return metadataObject
      }

      const __dirname = fileURLToPath(new URL('.', import.meta.url))
      const filePath = path.resolve(
        __dirname,
        '../../adapters',
        `${this.protocolId}/products/${this.product}/metadata`,
        `${ChainName[this.chainId]}.${fileKey}.json`,
      )

      if (!fs.existsSync(filePath)) {
        throw new Error('Metadata not found')
      }

      logger.debug(
        {
          protocolId: this.protocolId,
          product: this.product,
          chainId: this.chainId,
          fileKey,
        },
        'Metadata file loaded',
      )

      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }

    return replacementMethod
  }
}
