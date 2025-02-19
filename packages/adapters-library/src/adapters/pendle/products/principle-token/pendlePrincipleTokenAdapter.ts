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
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import { fetchAllMarkets } from '../../backend/backendSdk'
import { PENDLE_ROUTER_STATIC_CONTRACT } from '../../backend/constants'
import { RouterStatic__factory } from '../../contracts'

type AdditionalMetadata = {
  marketAddress: string
}

export class PendlePrincipleTokenAdapter implements IProtocolAdapter {
  productId = 'principle-token'
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
      name: 'Pendle',
      description: 'Pendle Market adapter',
      siteUrl: 'https://www.pendle.finance',
      iconUrl: 'https://app.pendle.finance/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const resp = await fetchAllMarkets(this.chainId)

    return await Promise.all(
      resp.results.map(async (value) => {
        const marketAddress = getAddress(value.address)

        const [pt, sy] = await Promise.all([
          this.helpers.getTokenMetadata(value.pt.address),
          this.helpers.getTokenMetadata(value.sy.address), // TODO: Check if decimals need to be underlyingAsset.decimals
        ])

        return {
          ...pt,
          underlyingTokens: [sy],
          marketAddress,
        }
      }),
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const {
      underlyingTokens: [underlyingToken],
      marketAddress,
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    const oracle = RouterStatic__factory.connect(
      PENDLE_ROUTER_STATIC_CONTRACT,
      this.provider,
    )

    // missing block number atm
    const rate = await oracle.getPtToSyRate(marketAddress, {
      blockTag: blockNumber,
    })

    const underlying = {
      type: TokenType.Underlying,

      underlyingRateRaw: rate,
      ...underlyingToken!,
    }

    return {
      baseRate: 1,
      type: TokenType.Protocol,
      ...protocolToken,
      tokens: [underlying],
    }
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
