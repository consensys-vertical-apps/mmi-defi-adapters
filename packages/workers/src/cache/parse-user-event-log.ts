import {
  type AdditionalMetadataConfig,
  LOG_ARGUMENT_TRANSFORMERS,
} from '@metamask-private/defi-adapters'
import { Interface, type Log, ZeroAddress, getAddress } from 'ethers'

export function parseUserEventLog(
  log: Log,
  eventAbi: string | null,
  userAddressIndex: number,
  additionalMetadataArguments?: AdditionalMetadataConfig,
  transformUserAddressType?: string,
) {
  let userAddress: string | undefined
  let metadata: Record<string, string> | undefined

  if (eventAbi) {
    const iface = new Interface([eventAbi])
    const decoded = iface.parseLog(log)

    if (!decoded) {
      throw new Error('Log does not match event abi')
    }

    const data = decoded.args[userAddressIndex] as string

    // Apply transformation if provided, otherwise use the data as-is
    const transformer = transformUserAddressType
      ? LOG_ARGUMENT_TRANSFORMERS[transformUserAddressType]
      : undefined
    const rawAddress = transformer ? transformer(data) : data

    // If transformer returns null, skip this log entry
    if (rawAddress === null) {
      return undefined
    }

    userAddress = getAddress(rawAddress.toLowerCase())

    // Extract additional metadata mapped to tokenId if specified
    if (additionalMetadataArguments) {
      metadata = {}

      const argIndex = iface.fragments[0]?.inputs.findIndex(
        (input) => input.name === additionalMetadataArguments.argumentName,
      )

      if (argIndex === -1) {
        throw new Error(
          `Argument ${additionalMetadataArguments.argumentName} not found in event abi ${eventAbi}`,
        )
      }

      if (argIndex !== undefined && decoded.args[argIndex] !== undefined) {
        metadata[additionalMetadataArguments.argumentName] = decoded.args[
          argIndex
        ] as string
      }
    }
  } else {
    const topic = log.topics[userAddressIndex]

    if (!topic) {
      throw new Error('Log does not have a topic at the given index')
    }

    // Not an address if it is does not start with 0x000000000000000000000000
    if (!topic.startsWith('0x000000000000000000000000')) {
      throw new Error('Topic is not an address')
    }

    userAddress = getAddress(`0x${topic.slice(-40).toLowerCase()}`)
  }

  if (userAddress !== ZeroAddress) {
    return { userAddress, metadata }
  }
}
