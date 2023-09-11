import fs from 'fs'
import path from 'path'
import { Json } from '../../types/json'
import { Chain, ChainNames } from '../constants/chains'
import { logger } from '../utils/logger'

export function cachedMetadata(adapterDirName: string) {
  return function actualDecorator(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalMethod: any,
    _context: ClassMethodDecoratorContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function replacementMethod(this: any, ...args: unknown[]) {
      const fileName = this.getMetadataFileName()
      const filePath = path.resolve(
        adapterDirName,
        `./metadata/${ChainNames[this.chainId as Chain]}.${fileName}.json`,
      )

      if (fs.existsSync(filePath)) {
        const fileContent: Json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        return fileContent
      }

      const product = adapterDirName.split('/').at(-1)!

      if (process.env.BUILD_METADATA_FILES !== 'true') {
        logger.error(
          {
            filePath,
            protocolId: this.protocolId,
            product,
            chainId: this.chainId,
          },
          'Metadata files missing',
        )
        throw new Error('Metadata files missing')
      }

      const result = await originalMethod.call(this, ...args)

      const newFilePath = path.resolve(
        `src/adapters/${this.protocolId}/products/${product}/metadata/${
          ChainNames[this.chainId as Chain]
        }.${fileName}.json`,
      )

      fs.mkdirSync(path.dirname(newFilePath), { recursive: true })

      fs.writeFileSync(newFilePath, JSON.stringify(result, null, 2), 'utf-8')

      return result
    }

    return replacementMethod
  }
}
