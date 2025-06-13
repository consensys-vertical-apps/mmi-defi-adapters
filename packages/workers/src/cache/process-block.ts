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
    }
  >
  logger: Logger
}): Promise<{ address: string; contractAddress: string }[]> {
  const receipts: TransactionReceipt[] = await withTimeout(
    provider.send('eth_getBlockReceipts', [
      `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`, // some chains need to remove leading zeros like ftm
    ]),
  )

  const logs: { address: string; contractAddress: string }[] = []

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

      const { userAddressIndex, eventAbi } = userIndexEntry

      try {
        const userAddress = parseUserEventLog(log, eventAbi, userAddressIndex)

        if (userAddress) {
          logs.push({
            address: userAddress,
            contractAddress,
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
