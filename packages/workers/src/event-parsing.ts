import { Interface, type Log, ZeroAddress, getAddress } from 'ethers'

export function parseLog(
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
    const topic = log.topics[userAddressIndex]!

    // Not an address if it is does not start with 0x000000000000000000000000
    if (topic.startsWith('0x000000000000000000000000')) {
      userAddress = getAddress(`0x${topic.slice(-40).toLowerCase()}`)
    }
  }

  if (userAddress && userAddress !== ZeroAddress) {
    return userAddress
  }
}
