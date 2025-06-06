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
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import {
  BalancerRateProvider__factory,
  XRenzoDeposit__factory,
} from '../../contracts'
import {
  BalancerRateProviderAddress,
  TokenAddresses,
  xRenzoDeposit,
} from './config'

export class RenzoEzEthAdapter implements IProtocolAdapter {
  productId = 'ez-eth'
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
      name: 'Renzo ezETH',
      description: 'Renzo defi adapter for ezETH',
      siteUrl: 'https://www.renzoprotocol.com/',
      iconUrl: 'https://www.renzoprotocol.com/favicon.ico',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const tokens = TokenAddresses[this.chainId]!
    const [protocolToken, underlyingToken] = await Promise.all([
      this.helpers.getTokenMetadata(tokens.protocolToken),
      this.helpers.getTokenMetadata(tokens.underlyingToken),
    ])

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

  getExchangeRate(blockNumber?: number): Promise<bigint> {
    if (this.chainId === Chain.Ethereum) {
      return BalancerRateProvider__factory.connect(
        BalancerRateProviderAddress,
        this.provider,
      ).getRate({ blockTag: blockNumber })
    }
    return XRenzoDeposit__factory.connect(
      xRenzoDeposit[this.chainId]!,
      this.provider,
    ).getRate({ blockTag: blockNumber })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const {
      underlyingTokens: [underlyingToken],
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken!,
          type: TokenType.Underlying,
          underlyingRateRaw: await this.getExchangeRate(blockNumber),
        },
      ],
    }
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
