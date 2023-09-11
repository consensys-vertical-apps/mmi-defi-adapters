import fs from 'fs'
import path from 'path'
import { Protocol } from '../../adapters'
import { Json } from '../../types/json'
import { Chain, ChainNames } from '../constants/chains'

export interface IMetadataBuilder {
  buildMetadata(): Promise<void>
}

export async function fetchMetadata<AdapterMetadata extends Json>({
  productDir,
  fileName,
  chainId,
}: {
  productDir: string
  fileName: string
  chainId: Chain
}): Promise<AdapterMetadata> {
  const filePath = path.resolve(
    productDir,
    `./metadata/${ChainNames[chainId]}.${fileName}.json`,
  )

  if (!fs.existsSync(filePath)) {
    throw new Error('Metadata not found')
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as AdapterMetadata
}

export async function writeMetadataToFile({
  protocolId,
  product,
  chainId,
  fileName,
  metadataObject,
}: {
  protocolId: Protocol
  product: string
  chainId: Chain
  fileName: string
  metadataObject: Json
}) {
  const newFilePath = path.resolve(
    `src/adapters/${protocolId}/products/${product}/metadata/${ChainNames[chainId]}.${fileName}.json`,
  )

  fs.mkdirSync(path.dirname(newFilePath), { recursive: true })

  fs.writeFileSync(
    newFilePath,
    JSON.stringify(metadataObject, null, 2),
    'utf-8',
  )
}
