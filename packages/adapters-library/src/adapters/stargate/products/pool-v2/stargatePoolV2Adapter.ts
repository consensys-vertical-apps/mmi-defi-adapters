import { getAddress } from 'ethers'
import type { AdaptersController } from '../../../../core/adaptersController.js'
import type { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import type { Helpers } from '../../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  type GetPositionsInput,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../../types/adapter.js'
import type { Protocol } from '../../../protocols.js'
import { staticChainDataV2 } from '../../common/staticChainData.js'
import { StargatePoolNative__factory } from '../../contracts/index.js'

export class StargatePoolV2Adapter implements IProtocolAdapter {
  productId = 'pool-v2'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Stargate Liquidity Pools V2',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const { poolAddresses: pools } = staticChainDataV2[this.chainId]!
    return await Promise.all(
      Object.values(pools).map(async (poolAddress) => {
        const stargatePoolContract = StargatePoolNative__factory.connect(
          poolAddress,
          this.provider,
        )

        const [protocolTokenAddress, underlyingTokenAddress] =
          await Promise.all([
            stargatePoolContract.lpToken(),
            stargatePoolContract.token(),
          ])

        const [protocolToken, underlyingToken] = await Promise.all([
          this.helpers.getTokenMetadata(getAddress(protocolTokenAddress)),
          this.helpers.getTokenMetadata(getAddress(underlyingTokenAddress)),
        ])

        return {
          ...protocolToken,
          underlyingTokens: [underlyingToken],
        }
      }),
    )
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)
    return this.helpers.unwrapOneToOne({
      protocolToken,
      underlyingTokens,
    })
  }
}
