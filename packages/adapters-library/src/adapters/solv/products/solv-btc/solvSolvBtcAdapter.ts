import { flatMap, uniq, zipObject } from 'lodash'
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
import { TokenAddresses } from './config'

export class SolvSolvBtcAdapter implements IProtocolAdapter {
  productId = 'solv-btc'
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
      name: 'Solv',
      description: 'Solv defi adapter',
      siteUrl: 'https://solv.finance/',
      iconUrl: 'https://solv.finance/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const tokenInfos = TokenAddresses[this.chainId]!

    // Extract all unique addresses (protocolToken and underlyingToken) from the input array
    const addresses = uniq(
      flatMap(tokenInfos, (item) => [item.protocolToken, item.underlyingToken]),
    )

    // Run getTokenMetadata for each unique address in parallel
    const metadataResults = await Promise.all(
      addresses.map((address) => this.helpers.getTokenMetadata(address)),
    )

    // Create a mapping from address to its metadata result
    const addressToMetadata = zipObject(addresses, metadataResults)

    return await Promise.all(
      tokenInfos.map(async (item) => ({
        ...addressToMetadata[item.protocolToken]!,
        underlyingTokens: [addressToMetadata[item.underlyingToken]!],
      })),
    )
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

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
