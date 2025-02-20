import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { nativeToken } from '../../../../core/utils/nativeTokens'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import { PX_ETH_DEPLOYMENTS } from '../../common/deploymentAddresses'

export class DineroPxEthAdapter implements IProtocolAdapter {
  productId = 'px-eth'
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
      name: 'Dinero',
      description: 'Dinero defi adapter for Pirex Ether (pxETH)',
      siteUrl: 'https://dinero.xyz/',
      iconUrl: 'https://dinero.xyz/images/eye.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    return [
      {
        ...(await this.helpers.getTokenMetadata(
          PX_ETH_DEPLOYMENTS[this.chainId]!,
        )),
        underlyingTokens: [
          {
            ...nativeToken[this.chainId],
            address: ZERO_ADDRESS,
          },
        ],
      },
    ]
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
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
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
    })
  }
}
