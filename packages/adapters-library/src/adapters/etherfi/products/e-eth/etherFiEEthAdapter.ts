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

const E_ETH_ADDRESS = getAddress('0x35fA164735182de50811E8e2E824cFb9B6118ac2')
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export class EtherFiEEthAdapter implements IProtocolAdapter {
  productId = 'e-eth'
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
      name: 'EtherFi eETH',
      description: 'EtherFi adapter for eTH',
      siteUrl: 'https://app.ether.fi/',
      iconUrl: 'https://app.ether.fi/favicon/favicon-32x32.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const protocolToken = await this.helpers.getTokenMetadata(E_ETH_ADDRESS)
    const underlyingToken = await this.helpers.getTokenMetadata(ZERO_ADDRESS)

    return [
      {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      },
    ]
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
    const protocolToken =
      await this.getProtocolTokenByAddress(protocolTokenAddress)
    const underlyingTokens = protocolToken.underlyingTokens
    if (!underlyingTokens || !underlyingTokens.length)
      throw new Error('No underlying tokens found')

    return this.helpers.unwrapOneToOne({
      protocolToken,
      underlyingTokens,
    })
  }
}
