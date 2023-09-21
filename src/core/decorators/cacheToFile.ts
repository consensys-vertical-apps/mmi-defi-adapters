import fs from 'fs'
import path from 'path'
import { Protocol } from '../../adapters'
import { IProtocolAdapter } from '../../types/adapter'
import { Json } from '../../types/json'
import { Chain, ChainName } from '../constants/chains'
import { logger } from '../utils/logger'

export interface IMetadataBuilder {
  product: string
  buildMetadata(writeToFile?: boolean): Promise<Json>
}

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

async function writeMetadataToFile({
  protocolId,
  product,
  chainId,
  fileKey,
  metadataObject,
}: {
  protocolId: Protocol
  product: string
  chainId: Chain
  fileKey: string
  metadataObject: Json
}) {
  const newFilePath = path.resolve(
    `src/adapters/${protocolId}/products/${product}/metadata/${ChainName[chainId]}.${fileKey}.json`,
  )

  fs.mkdirSync(path.dirname(newFilePath), { recursive: true })

  fs.writeFileSync(
    newFilePath,
    JSON.stringify(metadataObject, null, 2),
    'utf-8',
  )
}
