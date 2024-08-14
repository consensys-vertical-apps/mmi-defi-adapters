import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { TokenAddresses } from './config'

type Metadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

export class SolvSolvBtcAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'solv-btc'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
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

  @CacheToFile({ fileKey: 'solv-btc' })
  async buildMetadata(): Promise<Metadata> {
    const tokens = TokenAddresses[this.chainId]!
    const [protocolToken, underlyingToken] = await Promise.all([
      this.helpers.getTokenMetadata(tokens.protocolToken),
      this.helpers.getTokenMetadata(tokens.underlyingToken),
    ])
    return {
      [protocolToken.address]: {
        protocolToken,
        underlyingToken,
      },
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  /**
   * Unwraps the protocol token to its underlying token while accounting for decimal differences.
   *
   * This method resolves a 1:1 unwrap rate between `SolvBTC` and it's underlying (which depends on the chain),
   * even though they have different decimal places. It uses the underlying token's decimals to adjust the unwrap rate.
   *
   * @param {string} UnwrapInput.protocolTokenAddress - The address of the protocol token (SolvBTC) to unwrap.
   *
   * @returns {Promise<UnwrapExchangeRate>} A promise that resolves to an `UnwrapExchangeRate` object,
   * containing the details of the unwrapped tokens, including adjusted rates to account for decimal differences.
   *
   * @throws {Error} If there is an issue retrieving the protocol or underlying token information.
   *
   * @remark Currently, this implementation handles the specific case of `SolvBTC` and  it's underlying having different decimals.
   * If we encounter another protocol with a similar 1:1 rate but different decimal configurations,
   * we can refactor this logic into a helper function and introduce an option for this scenario in the corresponding questionnaire.
   */
  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const [protocolToken, underlyingToken] = await Promise.all([
      this.getProtocolToken(protocolTokenAddress),
      this.getUnderlyingToken(protocolTokenAddress),
    ])

    const pricePerShareRaw = BigInt(10 ** underlyingToken.decimals)

    return {
      address: protocolToken.address,
      name: protocolToken.name,
      symbol: protocolToken.symbol,
      decimals: protocolToken.decimals,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw: pricePerShareRaw,
        },
      ],
    }
  }

  private async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }
  private async getUnderlyingToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).underlyingToken
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
