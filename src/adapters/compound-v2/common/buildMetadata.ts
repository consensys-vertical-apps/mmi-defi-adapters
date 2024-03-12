import { Chain } from '../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Cerc20__factory, Comptroller__factory } from '../contracts'

export type CompoundV2MarketAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

export async function buildMetadata({
  chainId,
  provider,
  contractAddresses,
}: {
  chainId: Chain
  provider: CustomJsonRpcProvider
  contractAddresses: Partial<Record<Chain, { comptrollerAddress: string }>>
}) {
  const comptrollerContract = Comptroller__factory.connect(
    contractAddresses[chainId]!.comptrollerAddress,
    provider,
  )

  const pools = await comptrollerContract.getAllMarkets()

  const metadataObject: CompoundV2MarketAdapterMetadata = {}

  await Promise.all(
    pools.map(async (poolContractAddress) => {
      const poolContract = Cerc20__factory.connect(
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

      metadataObject[protocolToken.address] = {
        protocolToken,
        underlyingToken,
      }
    }),
  )

  return metadataObject
}
