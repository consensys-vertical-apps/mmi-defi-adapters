import { Protocol } from '../../adapters/protocols'
import { Helpers } from '../../core/helpers'
import {
  AdditionalMetadataWithReservedFields,
  IProtocolAdapter,
  JsonMetadata,
  ProtocolToken,
} from '../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
  UnwrappedTokenExchangeRate,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../utils/filters'

export abstract class SimplePoolAdapter<
  AdditionalMetadata extends
    AdditionalMetadataWithReservedFields = JsonMetadata,
> implements IProtocolAdapter
{
  chainId: Chain
  protocolId: Protocol
  abstract productId: string

  helpers: Helpers

  abstract adapterSettings: AdapterSettings

  protected provider: CustomJsonRpcProvider

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

  abstract getProtocolDetails(): ProtocolDetails

  abstract getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]>

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
    const protocolTokenMetadata =
      await this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const underlyingTokenConversionRate = await this.unwrapProtocolToken(
      protocolTokenMetadata,
      blockNumber,
    )

    return {
      ...protocolTokenMetadata,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: underlyingTokenConversionRate,
    }
  }

  /**
   * Fetches the protocol-token metadata
   * @param protocolTokenAddress
   */
  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { address, name, decimals, symbol } =
      await this.helpers.getProtocolTokenByAddress<AdditionalMetadata>({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      })

    return { address, name, decimals, symbol }
  }

  /**
   * Fetches the protocol-token's underlying token details
   * @param protocolTokenAddress
   */
  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } =
      await this.helpers.getProtocolTokenByAddress<AdditionalMetadata>({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      })

    return underlyingTokens!
  }

  /**
   * Fetches the LP token to underlying tokens exchange rate
   * @param protocolTokenMetadata
   * @param blockNumber
   */
  protected abstract unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnwrappedTokenExchangeRate[]>
}
