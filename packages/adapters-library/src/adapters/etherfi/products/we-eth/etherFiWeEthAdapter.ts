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
import { WeETH__factory } from '../../contracts/index.js'

const WE_ETH_ADDRESS = getAddress('0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee')
const E_ETH_ADDRESS = getAddress('0x35fA164735182de50811E8e2E824cFb9B6118ac2')

export class EtherFiWeEthAdapter implements IProtocolAdapter {
  productId = 'we-eth'
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
      name: 'EtherFi weETH',
      description: 'EtherFi adapter for weETH',
      siteUrl: 'https://app.ether.fi/',
      iconUrl: 'https://app.ether.fi/favicon/favicon-32x32.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const protocolToken = await this.helpers.getTokenMetadata(WE_ETH_ADDRESS)
    const underlyingToken = await this.helpers.getTokenMetadata(E_ETH_ADDRESS)

    return [
      {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      },
    ]
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({ blockNumber }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const weETHContract = WeETH__factory.connect(WE_ETH_ADDRESS, this.provider)

    const [protocolToken] = await this.getProtocolTokens()
    if (!protocolToken) throw new Error('No protocol token found')

    const underlyingToken = (protocolToken.underlyingTokens || [])[0]
    if (!underlyingToken) throw new Error('No protocol token found')

    const underlyingRateRaw = await weETHContract.getRate({
      blockTag: blockNumber,
    })

    return {
      baseRate: 1,
      type: 'protocol',
      ...protocolToken,
      tokens: [
        {
          type: 'underlying',
          underlyingRateRaw,
          ...underlyingToken,
        },
      ],
    }
  }
}
