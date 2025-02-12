import { Command } from 'commander'
import { ethers, getAddress } from 'ethers'
import {
  Chain,
  ChainIdToChainNameMap,
  EvmChain,
} from '../core/constants/chains'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { DefiProvider } from '../defiProvider'
import { BlockIndexer } from './blockIndexer'

export function indexer(program: Command, defiProvider: DefiProvider) {
  program
    .command('indexer')
    .option(
      '-c, --chain <chain>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-b, --block <block>',
      'optional block number to start indexing from',
    )
    .showHelpAfterError()
    .action(async ({ chain, block }: { chain?: string; block?: string }) => {
      const filterChainId = chain ? (Number(chain) as EvmChain) : undefined
      if (filterChainId && !ChainIdToChainNameMap[filterChainId]) {
        throw new Error(`No chain matches the given filter: ${chain}`)
      }
      const startBlockOverride = block ? Number(block) : undefined

      await Promise.all(
        Object.values(EvmChain)
          .filter(
            (chainId) =>
              filterChainId === undefined || filterChainId === chainId,
          )
          .map(async (chainId) =>
            processChain(chainId, defiProvider, startBlockOverride),
          ),
      )
    })
}

async function processChain(
  chainId: EvmChain,
  defiProvider: DefiProvider,
  startBlockOverride?: number,
) {
  const chainName = ChainIdToChainNameMap[chainId]
  console.log(`Starting indexer for chain: ${chainName}`)

  const provider = defiProvider.chainProvider.providers[chainId]

  const watchContractListCheckSum = await getDeFiContractAddressesCheckSum({
    defiProvider,
    chainId,
    chainName,
  })

  const indexer = new BlockIndexer({
    provider,
    chainId,
    chainName,
    dbName: `${chainName}_positions.db`,
    startBlockOverride: startBlockOverride,
    additionalTablesToCreate: {
      logs: `
        CREATE TABLE IF NOT EXISTS logs (
          contract_address CHAR(40) NOT NULL,
          address CHAR(40) NOT NULL,
          UNIQUE(contract_address, address)
        );
      `,
      contract_start_block: `
        CREATE TABLE IF NOT EXISTS contract_start_block (
          contract_address CHAR(40) NOT NULL,
          first_block_number INTEGER NOT NULL,
          PRIMARY KEY (contract_address)
        );
      `,
    },
  })

  const { lastProcessedBlockNumber } = await indexer.getIndexerBlockNumbers()

  // if block override is set, replace all start blocks with the override value
  if (startBlockOverride) {
    indexer.seedDb([
      Array.from(watchContractListCheckSum)
        .map(
          (address) =>
            `INSERT OR REPLACE INTO contract_start_block (contract_address, first_block_number) VALUES ('${address}', ${startBlockOverride});`,
        )
        .join('\n'),
    ])
  } else {
    // if no block override, then only insert new contract addresses that are not already in the db
    indexer.seedDb([
      Array.from(watchContractListCheckSum)
        .map(
          (address) =>
            `INSERT OR IGNORE INTO contract_start_block (contract_address, first_block_number) VALUES ('${address}', ${lastProcessedBlockNumber});`,
        )
        .join('\n'),
    ])
  }

  await indexer.processBlocks((blockNumber) =>
    fetchAndProcessLogs({
      provider,
      blockNumber,
      chainName: chainName.toLowerCase(),
      watchContractListLowercase: new Set(
        Array.from(watchContractListCheckSum).map((address) =>
          address.toLowerCase(),
        ),
      ),
    }),
  )
}

/**
 * Checksum without 0x
 * @param defiProvider
 * @param chainId
 * @param chainName
 * @returns
 */
async function getDeFiContractAddressesCheckSum({
  defiProvider,
  chainId,
  chainName,
}: { defiProvider: DefiProvider; chainId: Chain; chainName: string }) {
  const defiPoolAddresses = await defiProvider.getSupport({
    filterChainIds: [chainId],
  })

  const watchContractList = new Set<string>()
  for (const pools of Object.values(defiPoolAddresses || {})) {
    for (const pool of pools) {
      for (const address of pool.protocolTokenAddresses?.[chainId] || []) {
        watchContractList.add(getAddress(address).slice(2))
      }
    }
  }

  console.log(
    `Watching ${watchContractList.size} DeFi contracts on ${chainName}`,
  )
  return watchContractList
}

async function fetchAndProcessLogs({
  provider,
  blockNumber,
  chainName,
  watchContractListLowercase,
}: {
  provider: CustomJsonRpcProvider
  blockNumber: number
  chainName: string
  watchContractListLowercase: Set<string>
}): Promise<string[]> {
  const receipts = await provider.send('eth_getBlockReceipts', [
    `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`,
  ])

  const queries: string[] = []

  for (const receipt of receipts?.flat() || []) {
    for (const log of receipt.logs || []) {
      console.log(`[${chainName}] Processing log: ${log.address}`)

      // retuned lowercase from provider
      const contractAddressLowercase = log.address
      if (watchContractListLowercase.has(contractAddressLowercase.slice(2))) {
        log.topics
          .filter((topic: string) =>
            topic.startsWith('0x000000000000000000000000'),
          )
          .forEach((topic: string) =>
            queries.push(
              `INSERT OR IGNORE INTO logs (contract_address, address) VALUES ('${getAddress(
                contractAddressLowercase,
              ).slice(2)}', '${getAddress(topic.slice(-40).toLowerCase()).slice(
                2,
              )}');`,
            ),
          )
      }
    }
  }

  return queries
}
