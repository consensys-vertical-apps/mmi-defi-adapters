import type { BaseContract, JsonRpcProvider } from 'ethers'
import type { TypedContractEvent, TypedEventLog } from '../../contracts/common'

export async function findEventArgs<
  Contract extends BaseContract,
  EventLog extends TypedEventLog<TypedContractEvent>,
>(
  transactionHash: string,
  contract: Contract,
  eventName: keyof Contract['filters'],
  provider: JsonRpcProvider,
) {
  const transactionReceipt =
    await provider.getTransactionReceipt(transactionHash)

  if (!transactionReceipt) {
    throw new Error('Transaction receipt not found')
  }

  const contractAddress = await contract.getAddress()
  const filteredEvent = transactionReceipt.logs
    .filter((log) => log.address === contractAddress)
    .map((log) => contract.interface.parseLog(log))
    .filter(
      (log) =>
        log?.topic ===
        contract.interface.getEvent(eventName as string)?.topicHash,
    )

  if (filteredEvent.length === 0) {
    throw new Error('Event not found')
  }

  if (filteredEvent.length > 1) {
    throw new Error('Event is not unique')
  }
  return filteredEvent[0]?.args as EventLog['args']
}
