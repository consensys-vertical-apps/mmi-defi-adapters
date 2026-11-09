import {
  type AdditionalMetadataConfig,
  type EvmChain,
} from '@codefi/mmi-defi-adapters'
import {
  type JsonRpcProvider,
  type TransactionReceipt,
  ethers,
  getAddress,
} from 'ethers'
import type { Logger } from 'pino'
import { emitRpcCall } from '../metrics/index.js'
import { extractErrorMessage } from '../utils/extractErrorMessage.js'
import { withTimeout } from '../utils/with-timeout.js'
import type { UserIndex } from './build-latest-cache.js'
import { createWatchKey } from './create-watch-key.js'
import { parseUserEventLog } from './parse-user-event-log.js'

export async function processBlock({
  provider,
  blockNumber,
  userIndexMap,
  logger,
  chainId,
}: {
  provider: JsonRpcProvider
  blockNumber: number
  userIndexMap: UserIndex
  logger: Logger
  chainId: EvmChain
}): Promise<
  {
    address: string
    contractAddress: string
    metadata?: Record<string, string>
  }[]
> {
  // Step: count eth_getBlockReceipts used by the latest-cache path
  emitRpcCall({
    chainId,
    method: 'eth_getBlockReceipts',
    phase: 'latest',
  })
  const receipts: TransactionReceipt[] = await withTimeout(
    provider.send('eth_getBlockReceipts', [
      `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`, // some chains need to remove leading zeros like ftm
    ]),
  )

  return processReceipts(receipts, userIndexMap, logger)
}

export function processReceipts(
  receipts: TransactionReceipt[],
  userIndexMap: UserIndex,
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
