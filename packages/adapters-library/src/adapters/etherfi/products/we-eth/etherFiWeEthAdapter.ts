import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
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
import { WeETH__factory } from '../../contracts'

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
