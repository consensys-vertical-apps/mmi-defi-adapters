import {
  type JsonRpcProvider,
  type TransactionReceipt,
  ethers,
  getAddress,
} from 'ethers'
import type { Logger } from 'pino'
import { extractErrorMessage } from '../utils/extractErrorMessage.js'
import { withTimeout } from '../utils/with-timeout.js'
import { createWatchKey } from './create-watch-key.js'
import { parseUserEventLog } from './parse-user-event-log.js'

export async function processBlock({
  provider,
  blockNumber,
  userIndexMap,
  logger,
}: {
  provider: JsonRpcProvider
  blockNumber: number
  userIndexMap: Map<
    string,
    {
      userAddressIndex: number
      eventAbi: string | null
      additionalMetadataArguments?: Record<string, string>
      transformUserAddressType?: string
    }
  >
  logger: Logger
}): Promise<
  {
    address: string
    contractAddress: string
    metadata?: Record<string, string>
  }[]
> {
  const receipts: TransactionReceipt[] = await withTimeout(
    provider.send('eth_getBlockReceipts', [
      `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`, // some chains need to remove leading zeros like ftm
    ]),
  )

  return processReceipts(receipts, userIndexMap, logger)
}

export function processReceipts(
  receipts: TransactionReceipt[],
  userIndexMap: Map<
    string,
    {
      userAddressIndex: number
      eventAbi: string | null
      additionalMetadataArguments?: Record<string, string>
      transformUserAddressType?: string
    }
  >,
  logger: Logger,
) {
  const logs: {
    address: string
    contractAddress: string
    metadata?: Record<string, string>
  }[] = []

  for (const receipt of receipts?.flat() || []) {
    for (const log of receipt.logs || []) {
      const topic0 = log.topics[0]
      if (!topic0) {
        // skip when no topic0 because our adapters expect a topic0
        continue
      }

      const contractAddress = getAddress(log.address.toLowerCase())

      const userIndexEntry = userIndexMap.get(
        createWatchKey(contractAddress, topic0),
      )
      if (!userIndexEntry) {
        continue
      }

      const {
        userAddressIndex,
        eventAbi,
        additionalMetadataArguments,
        transformUserAddressType,
      } = userIndexEntry

      try {
        const result = parseUserEventLog(
          log,
          eventAbi,
          userAddressIndex,
          additionalMetadataArguments,
          transformUserAddressType,
        )

        if (result) {
          logs.push({
            address: result.userAddress,
            contractAddress,
            metadata: result.metadata,
          })
        }
      } catch (error) {
        logger.error(
          {
            error: extractErrorMessage(error),
            txHash: log.transactionHash,
            eventAbi,
            userAddressIndex,
          },
          'Error parsing log',
        )
      }
    }
  }

  return logs
}
