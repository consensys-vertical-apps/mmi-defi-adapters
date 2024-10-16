import {
  CompoundV2Cerc20__factory,
  CompoundV2Comptroller__factory,
} from '../../contracts/index.js'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS.js'
import type { Chain } from '../constants/chains.js'
import type { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider.js'
import { getTokenMetadata } from '../utils/getTokenMetadata.js'

export async function getProtocolTokens({
  chainId,
  provider,
  contractAddresses,
}: {
  chainId: Chain
  provider: CustomJsonRpcProvider
  contractAddresses: Partial<Record<Chain, { comptrollerAddress: string }>>
}) {
  const comptrollerContract = CompoundV2Comptroller__factory.connect(
    contractAddresses[chainId]!.comptrollerAddress,
    provider,
  )

  const pools = await comptrollerContract.getAllMarkets()

  return await Promise.all(
    pools.map(async (poolContractAddress) => {
      const poolContract = CompoundV2Cerc20__factory.connect(
        poolContractAddress,
        provider,
      )

      let underlyingContractAddress: string
      try {
        underlyingContractAddress = await poolContract.underlying()
      } catch (error) {
        underlyingContractAddress = ZERO_ADDRESS
      }

      const protocolTokenPromise = getTokenMetadata(
        poolContractAddress,
        chainId,
        provider,
      )
      const underlyingTokenPromise = getTokenMetadata(
        underlyingContractAddress,
        chainId,
        provider,
      )

      const [protocolToken, underlyingToken] = await Promise.all([
        protocolTokenPromise,
        underlyingTokenPromise,
      ])

      return {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      }
    }),
  )
}
