// Import modules for worker thread communication, blockchain constants, and cache building
import { parentPort } from 'node:worker_threads'
import {
  AVERAGE_BLOCKS_PER_DAY,
  type EvmChain,
  ETH2_DEPOSIT_CONTRACT_ADDRESS,
  ETH2_TYPE_00_WITHDRAWAL_PLACEHOLDER_ADDRESS,
} from '@metamask-institutional/defi-adapters'
import { getAddress, type JsonRpcProvider } from 'ethers'
import type { Logger } from 'pino'
import { buildHistoricCache } from './cache/build-historic-cache.js'
import { type UserIndex, buildLatestCache } from './cache/build-latest-cache.js'
import { createWatchKey } from './cache/create-watch-key.js'
import type { CacheClient } from './database/postgres-cache-client.js'

// Interval for logging processing status (60 seconds)
const SIXTY_SECONDS = 60_000

// QuickNode Beacon API response types
interface ValidatorInfo {
  pubkey: string
  withdrawal_credentials: string
  effective_balance: string
  slashed: boolean
  activation_eligibility_epoch: string
  activation_epoch: string
  exit_epoch: string
  withdrawable_epoch: string
}

interface ValidatorData {
  index: string
  balance: string
  status: string
  validator: ValidatorInfo
}

interface QuickNodeBeaconResponse {
  data: ValidatorData[]
}

/**
 * Main processing loop that runs two parallel services:
 * 1. Historic cache building (backfills old data)
 * 2. Latest cache building (processes new blocks in real-time)
 */
export async function runnerLoop({
  blockNumber,
  provider,
  chainId,
  cacheClient,
  logger,
}: {
  blockNumber: number
  provider: JsonRpcProvider
  chainId: EvmChain
  cacheClient: CacheClient
  logger: Logger
}) {
  /**
   * Historic Cache Loop - Backfills historical blockchain data
   * This runs continuously to catch up on old blocks that haven't been processed yet
   */
  const historicCacheLoop = async () => {
    while (true) {
      // Build historic cache for any blocks that were missed or need reprocessing
      await buildHistoricCache(
        provider,
        chainId,
        cacheClient,
        logger.child({
          subService: 'historic-cache', // Child logger for better log organization
        }),
      )
    }
  }

  /**
   * Latest Cache Loop - Processes new blocks in real-time
   * This is the main processing pipeline that handles incoming blockchain events
   */
  const latestCacheLoop = async () => {
    // Fetch all configured jobs/tasks from the database
    // These define which smart contracts and events to monitor
    const allJobs = await cacheClient.fetchAllJobs()

    // Create a mapping of contract events to their processing configuration
    // This allows us to quickly look up how to process each type of blockchain event
    const userIndexMap: UserIndex = new Map(
      allJobs.map(
        ({
          contractAddress, // Smart contract address to monitor
          topic0, // Event signature hash (first topic)
          userAddressIndex, // Which event parameter contains the user address
          eventAbi, // Event ABI for decoding event data
          additionalMetadataArguments, // Additional data to extract from events
          transformUserAddressType, // How to transform the user address (if needed)
        }) => [
          // Create a unique key for this contract+event combination
          createWatchKey(contractAddress, topic0),
          {
            userAddressIndex,
            eventAbi,
            additionalMetadataArguments,
            transformUserAddressType,
          },
        ],
      ),
    )

    // Initialize processing state
    let nextProcessingBlockNumber = blockNumber // Next block to process
    let latestBlockNumber = await provider.getBlockNumber() // Current blockchain height

    // Calculate blocks per hour for this chain (used for lag reporting)
    const BLOCKS_PER_HOUR = AVERAGE_BLOCKS_PER_DAY[chainId] / 24

    // Set up periodic logging to monitor processing progress
    // This helps track if we're falling behind the blockchain
    setInterval(() => {
      const blocksLagging = latestBlockNumber - nextProcessingBlockNumber - 1
      const lagInHours = (blocksLagging / BLOCKS_PER_HOUR).toFixed(1)

      logger.info(
        {
          processingBlockNumber: nextProcessingBlockNumber,
          latestBlockNumber,
          blocksLagging,
          blocksPerHour: BLOCKS_PER_HOUR,
          lagInHours,
        },
        'Latest block cache update',
      )
    }, SIXTY_SECONDS)

    // Main processing loop - runs continuously
    while (true) {
      // Process the next batch of blocks and update the cache
      const result = await buildLatestCache({
        processingBlockNumber: nextProcessingBlockNumber,
        provider,
        cacheClient,
        userIndexMap,
        logger: logger.child({
          subService: 'latest-cache',
        }),
      })

      // Update our processing state with the results
      nextProcessingBlockNumber = result.nextProcessingBlockNumber
      latestBlockNumber = result.latestBlockNumber

      // Send progress update to the parent process (main.ts)
      // This allows the API server to report current processing status
      parentPort?.postMessage({
        chainId,
        lastProcessedBlockNumber: nextProcessingBlockNumber - 1,
        latestBlockNumber,
      })
    }
  }

  // Simple ETH2 withdrawal credentials updater job
  console.log('🚀 Starting ETH2 withdrawal credentials update process...')

  // 1. Wait for the eth2 job to complete (simulate with a simple while loop)
  console.log('⏳ Step 1: Waiting for ETH2 job to complete...')
  let eth2JobComplete = false
  while (!eth2JobComplete) {
    // TODO: Replace with real check for eth2 job status
    // For now, just wait 5 seconds and assume it's done
    console.log('⏳ Waiting 5 seconds for ETH2 job completion...')
    await new Promise((resolve) => setTimeout(resolve, 5000))
    eth2JobComplete = true
  }
  console.log('✅ Step 1: ETH2 job completed')

  // 2. Grab validator pubkeys from database with placeholder address
  console.log('🔍 Step 2: Fetching validator pubkeys from database...')
  const validatorKeys: string[] =
    (await cacheClient.getEth2StakingPubkeysWithPlaceholderAddress()) ?? []

  console.log(
    `📊 Step 2: Found ${validatorKeys.length} validator pubkeys with placeholder address`,
  )

  // For now, just process one pubkey (the first, if any)
  const pubkeysToProcess =
    validatorKeys.length > 0 ? validatorKeys.slice(0, 100) : []

  if (validatorKeys.length > 0) {
    console.log(
      `📋 Step 2: First few pubkeys: ${validatorKeys.slice(0, 3).join(', ')}`,
    )
  }

  // 3. Request to QuickNode endpoint for validator info
  console.log('🌐 Step 3: Preparing QuickNode API request...')

  // Check that BEACON_BASE_URL and BEACON_NODE_API_KEY are set in the environment
  if (!process.env.BEACON_BASE_URL || !process.env.BEACON_NODE_API_KEY) {
    console.error(
      '❌ Missing required environment variables: BEACON_BASE_URL and/or BEACON_NODE_API_KEY',
    )
    logger.error(
      {
        BEACON_BASE_URL: process.env.BEACON_BASE_URL,
        BEACON_NODE_API_KEY: process.env.BEACON_NODE_API_KEY,
      },
      'Missing required environment variables: BEACON_BASE_URL and/or BEACON_NODE_API_KEY',
    )
    throw new Error(
      'Missing required environment variables: BEACON_BASE_URL and/or BEACON_NODE_API_KEY',
    )
  }

  logger.error(
    {
      BEACON_BASE_URL: process.env.BEACON_BASE_URL,
      BEACON_NODE_API_KEY: process.env.BEACON_NODE_API_KEY,
    },
    'Missing required environment variables: BEACON_BASE_URL and/or BEACON_NODE_API_KEY',
  )

  const baseUrl = `${process.env.BEACON_BASE_URL}/${process.env.BEACON_NODE_API_KEY}/eth/v1/beacon/states/head/validators?status=active`
  console.log(
    `🔗 Step 3: Base URL configured: ${baseUrl.replace(process.env.BEACON_NODE_API_KEY!, '[REDACTED]')}`,
  )

  // The API expects a comma-separated list of validator pubkeys in the "id" param
  const quicknodeUrl = new URL(baseUrl)
  quicknodeUrl.searchParams.set('id', pubkeysToProcess.join(','))

  console.log(
    `📡 Step 3: Making API request for ${pubkeysToProcess.length} validators...`,
  )
  console.log(
    `🔗 Step 3: Full URL: ${quicknodeUrl.toString().replace(process.env.BEACON_NODE_API_KEY!, '[REDACTED]')}`,
  )

  const response = await fetch(quicknodeUrl.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    console.error(
      `❌ Step 3: API request failed with status ${response.status}: ${response.statusText}`,
    )
    logger.error(
      { status: response.status, statusText: response.statusText },
      'Failed to fetch validator info from QuickNode',
    )
  } else {
    console.log(
      `✅ Step 3: API request successful (status: ${response.status})`,
    )
    const data = (await response.json()) as QuickNodeBeaconResponse
    console.log(
      `📊 Step 3: Received data for ${data.data?.length || 0} validators`,
    )

    // 4. Process validator data and update database
    console.log('🔄 Step 4: Processing validator withdrawal credentials...')
    const updatesToProcess: Array<{ pubkey: string; userAddress: string }> = []
    let updatedCount = 0
    let notUpdatedCount = 0

    for (const item of data.data ?? []) {
      const pubkey = item.validator?.pubkey
      const withdrawalCredentials = item.validator?.withdrawal_credentials
      if (!pubkey || !withdrawalCredentials) {
        console.log(
          `⚠️ Step 4: Skipping validator with missing data: ${pubkey || 'unknown'}`,
        )
        continue
      }

      // If withdrawal_credentials starts with 0x01, it has been updated
      // If starts with 0x00, it has not been updated
      if (withdrawalCredentials.startsWith('0x01')) {
        // Extract the Ethereum address from withdrawal credentials (last 20 bytes)
        const ethAddress = getAddress(`0x${withdrawalCredentials.slice(-40)}`)
        updatesToProcess.push({ pubkey, userAddress: ethAddress })
        updatedCount++
        console.log(
          `✅ Step 4: Validator ${pubkey.slice(0, 10)}... has updated withdrawal credentials -> ${ethAddress}`,
        )
        logger.info(
          { pubkey, withdrawalCredentials, ethAddress },
          'Validator withdrawal credentials have been updated',
        )
      } else if (withdrawalCredentials.startsWith('0x00')) {
        notUpdatedCount++
        console.log(
          `⏳ Step 4: Validator ${pubkey.slice(0, 10)}... still has BLS withdrawal credentials`,
        )
        logger.info(
          { pubkey, withdrawalCredentials },
          'Validator withdrawal credentials have NOT been updated',
        )
      }
    }

    console.log(
      `📊 Step 4: Summary - ${updatedCount} updated, ${notUpdatedCount} not updated`,
    )

    // 5. Update database with new addresses
    if (updatesToProcess.length > 0) {
      console.log(
        `💾 Step 5: Updating database with ${updatesToProcess.length} address changes...`,
      )
      try {
        await cacheClient.updateUserAddressesForPubkeys(updatesToProcess)
        console.log(
          `✅ Step 5: Successfully updated ${updatesToProcess.length} addresses in database`,
        )
      } catch (error) {
        console.error(`❌ Step 5: Failed to update database:`, error)
        logger.error(
          { error, updatesCount: updatesToProcess.length },
          'Failed to update user addresses in database',
        )
      }
    } else {
      console.log('ℹ️ Step 5: No address updates needed')
    }
  }

  console.log('🎉 ETH2 withdrawal credentials update process completed!')
  // Historic cache building and latest cache building happen simultaneously
  // await Promise.all([historicCacheLoop(), latestCacheLoop()])
}
