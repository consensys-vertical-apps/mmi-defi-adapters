import { Interface, type Log, ZeroAddress, getAddress } from 'ethers'

export function parseUserEventLog(
  log: Log,
  eventAbi: string | null,
  userAddressIndex: number,
) {
  let userAddress: string | undefined

  if (eventAbi) {
    const iface = new Interface([eventAbi])
    const decoded = iface.parseLog(log)

    if (!decoded) {
      throw new Error('Log does not match event abi')
    }

    const data = decoded.args[userAddressIndex] as string
    userAddress = getAddress(data.toLowerCase())
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
    return userAddress
  }
}
