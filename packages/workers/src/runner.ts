import {
  Chain,
  ChainName,
  DefiProvider,
  EvmChain,
} from '@metamask-institutional/defi-adapters'
import type { Database } from 'better-sqlite3'
import { getAddress, JsonRpcProvider, Network } from 'ethers'
import { buildHistoricCache } from './build-historic-cache.js'
import { buildLatestCache } from './build-latest-cache.js'
import { dbTables, getLatestBlockProcessed, insertJobs } from './db-queries.js'
import {
  addColumnIfNotExists,
  createDatabase,
  createTable,
} from './db-utils.js'
import { logger } from './logger.js'

export async function runner(
  dbDirPath: string,
  chainId: EvmChain,
  runSettings: 'both' | 'historic' | 'latest',
  blockNumberOverride?: number,
) {
  const db = createDatabase(dbDirPath, `${ChainName[chainId]}_index`, {
    fileMustExist: false,
    readonly: false,
    timeout: 5000,
  })

  for (const table of Object.values(dbTables)) {
    createTable(db, table)
  }

  newColumnsMigration(db)

  // TODO: Remove this once we have support for Fantom
  if (chainId === Chain.Fantom) {
    logger.warn(
      {
        chainId,
      },
      'Chain not supported',
    )

    return
  }

  const defiProvider = new DefiProvider()

  const providerUrl =
    defiProvider.chainProvider.providers[chainId]._getConnection().url

  const provider = new JsonRpcProvider(providerUrl, chainId, {
    staticNetwork: Network.from(chainId),
  })

  const blockNumber =
    blockNumberOverride ??
    getLatestBlockProcessed(db) ??
    (await provider.getBlockNumber())

  // TODO: By calling it here, we are only able to add new jobs whenever this script starts
  // If we dynamically call this, we need to ensure that there is no race condition with the historic and latest cache
  await insertContractEntries(defiProvider, chainId, db, blockNumber)

  const runners: Promise<void>[] = []
  switch (runSettings) {
    case 'both':
      runners.push(buildHistoricCache(provider, chainId, db))
      runners.push(buildLatestCache(provider, chainId, db, blockNumber))
      break
    case 'historic':
      runners.push(buildHistoricCache(provider, chainId, db))
      break
    case 'latest':
      runners.push(buildLatestCache(provider, chainId, db, blockNumber))
      break
  }

  await Promise.all(runners)
}

async function insertContractEntries(
  defiProvider: DefiProvider,
  chainId: EvmChain,
  db: Database,
  blockNumber: number,
) {
  const defiPoolAddresses = await defiProvider.getSupport({
    filterChainIds: [chainId],
  })

  const protocolTokenEntries = new Map<
    string,
    {
      address: string
      topic0: string
      userAddressIndex: number
      eventContract?: string
      filter?: [string | null, string | null, string | null]
    }
  >()
  for (const adapterSupportArray of Object.values(defiPoolAddresses || {})) {
    for (const adapterSupport of adapterSupportArray) {
      if (!adapterSupport.userEvent) {
        continue
      }

      for (const address of adapterSupport.protocolTokenAddresses?.[chainId] ||
        []) {
        if (!adapterSupport.userEvent) {
          continue
        }

        const { topic0, userAddressIndex, eventContract, filter } =
          adapterSupport.userEvent === 'Transfer'
            ? {
                topic0:
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                userAddressIndex: 2,
                eventContract: undefined,
                filter: undefined,
              }
            : adapterSupport.userEvent

        protocolTokenEntries.set(
          `${address.slice(2)}#${topic0}#${userAddressIndex}`,
          {
            address,
            topic0,
            userAddressIndex,
            eventContract: eventContract
              ? getAddress(eventContract.toLowerCase())
              : undefined,
            filter,
          },
        )
      }
    }
  }

  insertJobs(db, Array.from(protocolTokenEntries.values()), blockNumber)
}

function newColumnsMigration(db: Database) {
  addColumnIfNotExists(db, 'jobs', 'event_contract', 'CHAR(42)')
  addColumnIfNotExists(db, 'jobs', 'filter', 'TEXT')
}
