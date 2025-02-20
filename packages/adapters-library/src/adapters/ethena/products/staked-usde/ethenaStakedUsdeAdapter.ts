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

const SUSDE_TOKEN_ADDRESS = getAddress(
  '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
)
const USDE_TOKEN_ADDRESS = getAddress(
  '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
)

export class EthenaStakedUsdeAdapter implements IProtocolAdapter {
  productId = 'staked-usde'
  protocolId: Protocol
  chainId: Chain

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController
  helpers: Helpers

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
      name: 'Ethena sUSDe',
      description: 'Ethena defi adapter',
      siteUrl: 'https://ethena.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x57e114b691db790c35207b2e685d4a43181e6061/logo.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const protocolToken =
      await this.helpers.getTokenMetadata(SUSDE_TOKEN_ADDRESS)

    const underlyingToken =
      await this.helpers.getTokenMetadata(USDE_TOKEN_ADDRESS)

    return [
      {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      },
    ]
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ..._input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return this.helpers.unwrapTokenAsRatio({
      protocolToken,
      underlyingTokens,
      blockNumber,
    })
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
