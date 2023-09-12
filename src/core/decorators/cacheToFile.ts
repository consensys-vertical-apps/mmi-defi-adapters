import fs from 'fs'
import path from 'path'
import { IProtocolAdapter } from '../../types/adapter'
import { ChainNames } from '../constants/chains'
import { logger } from '../utils/logger'
import { IMetadataBuilder, writeMetadataToFile } from '../utils/metadata'

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

      const filePath = path.resolve(
        __dirname,
        '../../adapters',
        `${this.protocolId}/products/${this.product}/metadata`,
        `${ChainNames[this.chainId]}.${fileKey}.json`,
      )

      if (!fs.existsSync(filePath)) {
        throw new Error('Metadata not found')
      }

      logger.info(
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
