import type {
  AdditionalMetadataConfig,
  Chain,
  DefiProvider,
  EvmChain,
  Support,
} from '@metamask-private/defi-adapters'
import { Interface, id } from 'ethers'
import type { Logger } from 'pino'
import type { CacheClient } from './database/postgres-cache-client.js'

export async function updateNewJobs({
  chainId,
  blockNumber,
  defiProvider,
  cacheClient,
  logger,
}: {
  chainId: EvmChain
  blockNumber: number
  defiProvider: DefiProvider
  cacheClient: CacheClient
  logger: Logger
}) {
  const pools = await fetchAllPools(defiProvider, chainId, logger)

  const newPools = await cacheClient.insertJobs(pools, blockNumber)

  logger.info({ totalJobs: pools.length, newJobs: newPools }, 'Jobs updated')
}

export async function fetchAllPools(
  defiProvider: DefiProvider,
  chainId: EvmChain,
  logger: Logger,
) {
  const defiPoolAddresses = await defiProvider.getSupport({
    filterChainIds: [chainId],
  })

  return buildTokenEventMappings(defiPoolAddresses, chainId, logger)
}

export function buildTokenEventMappings(
  defiPoolAddresses: Support,
  chainId: Chain,
  logger: Logger,
) {
  const createProtocolTokenKey = (
    address: string,
    topic0: `0x${string}`,
    userAddressIndex: number,
  ) => `${address}#${topic0}#${userAddressIndex}`

  const protocolTokenEntries = new Map<
    string,
    | {
        contractAddress: string
        topic0: `0x${string}`
        userAddressIndex: 1 | 2 | 3
      }
    | {
        contractAddress: string
        topic0: `0x${string}`
        userAddressIndex: number
        eventAbi: string
        additionalMetadataArguments?: AdditionalMetadataConfig
        transformUserAddressType?: string
      }
  >()
  for (const adapterSupportArray of Object.values(defiPoolAddresses ?? {})) {
    for (const { userEvent, protocolTokenAddresses } of adapterSupportArray) {
      if (!userEvent) {
        continue
      }

      for (const address of protocolTokenAddresses?.[chainId] ?? []) {
        if (userEvent === 'Transfer') {
          const topic0 =
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
          const userAddressIndex = 2

          protocolTokenEntries.set(
            createProtocolTokenKey(address, topic0, userAddressIndex),
            {
              contractAddress: address,
              topic0,
              userAddressIndex,
            },
          )
        } else if ('topic0' in userEvent && 'userAddressIndex' in userEvent) {
          const topic0 = userEvent.topic0
          const userAddressIndex = userEvent.userAddressIndex

          protocolTokenEntries.set(
            createProtocolTokenKey(address, topic0, userAddressIndex),
            {
              contractAddress: address,
              topic0,
              userAddressIndex,
            },
          )
        } else if (
          'eventAbi' in userEvent &&
          'userAddressArgument' in userEvent
        ) {
          const iface = new Interface([userEvent.eventAbi])
          const eventFragment = iface.fragments[0]
          if (!eventFragment || eventFragment.type !== 'event') {
            logger.error(
              {
                contractAddress: address,
                userEvent,
                eventFragment: eventFragment?.format(),
              },
              'Event fragment is not an event',
            )

            continue
          }

          const topic0 = id(eventFragment.format()) as `0x${string}`
          const userAddressIndex = eventFragment.inputs.findIndex(
            (input) => input.name === userEvent.userAddressArgument,
          )

          if (userAddressIndex === -1) {
            logger.error(
              { address, userEvent, eventFragment: eventFragment.format() },
              'User address index not found',
            )
          }
          protocolTokenEntries.set(
            createProtocolTokenKey(address, topic0, userAddressIndex),
            {
              contractAddress: address,
              topic0,
              userAddressIndex,
              eventAbi: userEvent.eventAbi,
              additionalMetadataArguments:
                userEvent.additionalMetadataArguments,
              transformUserAddressType: userEvent.transformUserAddressType,
            },
          )
        }
      }
    }
  }

  return Array.from(protocolTokenEntries.values())
}
