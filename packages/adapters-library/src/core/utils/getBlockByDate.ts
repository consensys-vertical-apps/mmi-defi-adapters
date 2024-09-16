import { Block, JsonRpcProvider } from 'ethers'

/**
 * Performs a binary search to find the closest block by date.
 */
export async function getBlockByDate(
  provider: JsonRpcProvider,
  targetDate: Date,
): Promise<Block | null> {
  // Convert the target date to a UNIX timestamp (seconds since epoch)
  const targetTimestamp = Math.floor(targetDate.getTime() / 1000)

  // Get the latest block number
  const latestBlockNumber = await provider.getBlockNumber()

  // Perform a binary search between block 0 and the latest block
  let lowerBound = 0
  let upperBound = latestBlockNumber

  while (lowerBound <= upperBound) {
    const middle = Math.floor((lowerBound + upperBound) / 2)
    console.log('moddile0', middle)
    const middleBlock = await provider.getBlock(middle)

    if (!middleBlock) throw new Error(`Block ${middle} not found`)

    if (middleBlock.timestamp === targetTimestamp) {
      return middleBlock // Found the block with the exact timestamp
    }

    if (middleBlock.timestamp < targetTimestamp) {
      lowerBound = middle + 1
    } else {
      upperBound = middle - 1
    }
  }

  // After the loop, the upperBound block will be the one closest to the target date
  return provider.getBlock(upperBound)
}
