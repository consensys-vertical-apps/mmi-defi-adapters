import { type Database } from 'better-sqlite3'
import { CustomJsonRpcProvider } from './core/provider/CustomJsonRpcProvider'
import { EvmChain } from './core/constants/chains'
import { AdapterSettings } from './types/adapter'

export type PoolFilter = (
  userAddress: string,
  chainId: EvmChain,
  adapterSettings: AdapterSettings,
) => Promise<string[] | undefined>

export function buildProviderPoolFilter(
  providers: Partial<Record<EvmChain, CustomJsonRpcProvider>>,
): PoolFilter {
  return async (
    userAddress: string,
    chainId: EvmChain,
    adapterSettings: AdapterSettings,
  ): Promise<string[] | undefined> => {
    const provider = providers[chainId]

    if (
      !provider ||
      !adapterSettings.enablePositionDetectionByProtocolTokenTransfer ||
      !adapterSettings.includeInUnwrap
    ) {
      return undefined
    }

    const transferLogs = await provider.getAllTransferLogsToAddress(userAddress)

    return Array.from(new Set(transferLogs.map((log) => log.address)))
  }
}

export function buildCachePoolFilter(
  dbs: Partial<Record<EvmChain, Database>>,
): PoolFilter {
  return async (
    userAddress: string,
    chainId: EvmChain,
    adapterSettings: AdapterSettings,
  ): Promise<string[] | undefined> => {
    const db = dbs[chainId]
    if (!db || adapterSettings.userEvent === false) {
      return undefined
    }

    const pendingPools = db
      .prepare(`
        SELECT 	contract_address
        FROM 	history_logs
        WHERE 	address = ?
        `)
      .all(userAddress.slice(2)) as {
      contract_address: string
    }[]

    return pendingPools.map((pool) => `0x${pool.contract_address}`)
  }
}
