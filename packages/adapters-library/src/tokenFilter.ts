import { EvmChain } from './core/constants/chains'
import { ProviderMissingError } from './core/errors/errors'
import { CustomJsonRpcProvider } from './core/provider/CustomJsonRpcProvider'
import { AdapterSettings } from './types/adapter'

export type PoolFilter = (
  userAddress: string,
  chainId: EvmChain,
) => Promise<string[] | undefined>

export function buildProviderPoolFilter(
  providers: Partial<Record<EvmChain, CustomJsonRpcProvider>>,
): PoolFilter {
  return async (
    userAddress: string,
    chainId: EvmChain,
  ): Promise<string[] | undefined> => {
    const provider = providers[chainId]

    if (!provider) {
      throw new ProviderMissingError(chainId)
    }

    const transferLogs = await provider.getAllTransferLogsToAddress(userAddress)

    return Array.from(new Set(transferLogs.map((log) => log.address)))
  }
}

// export type PoolFilter = (
//   userAddress: string,
//   chainId: EvmChain,
//   adapterSettings: AdapterSettings,
// ) => Promise<string[] | undefined>

// export function buildProviderPoolFilter(
//   providers: Partial<Record<EvmChain, CustomJsonRpcProvider>>,
// ): PoolFilter {
//   return async (
//     userAddress: string,
//     chainId: EvmChain,
//     adapterSettings: AdapterSettings,
//   ): Promise<string[] | undefined> => {
//     const provider = providers[chainId]

//     if (
//       !provider ||
//       adapterSettings.userEvent !== 'Transfer' ||
//       !adapterSettings.includeInUnwrap
//     ) {
//       return undefined
//     }

//     const transferLogs = await provider.getAllTransferLogsToAddress(userAddress)

//     return Array.from(new Set(transferLogs.map((log) => log.address)))
//   }
// }
