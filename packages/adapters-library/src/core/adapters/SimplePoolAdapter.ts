import { Protocol } from '../../adapters/protocols'
import { Erc20__factory } from '../../contracts'
import { TransferEvent } from '../../contracts/Erc20'
import { Helpers } from '../../scripts/helpers'
import {
  IProtocolAdapter,
  JsonMetadata,
  ProtocolToken,
} from '../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
  UnwrappedTokenExchangeRate,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { AdaptersController } from '../adaptersController'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { Chain } from '../constants/chains'
import { MaxMovementLimitExceededError } from '../errors/errors'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../utils/filters'

export abstract class SimplePoolAdapter<AdditionalMetadata extends JsonMetadata>
  implements IProtocolAdapter
{
  chainId: Chain
  protocolId: Protocol
  abstract productId: string

  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

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
    const protocolTokenMetadata = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )

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

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
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
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.borrows({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getRepays({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.repays({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokensWithoutUnderlyingTokens = await this.getProtocolTokens()
    const protocolTokens = await filterMapAsync(
      protocolTokensWithoutUnderlyingTokens,
      async (protocolToken) => {
        const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
          protocolToken.address,
        )

        return {
          ...protocolToken,
          underlyingTokens,
        }
      },
    )

    return await this.helpers.tvlUsingUnderlyingTokenBalances({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
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
   * Calculates the user's underlying token balances.
   * We pass here the LP token balance and find the underlying token balances
   * Refer to dashboard screenshot located here ./dashboard.png for example
   *
   * @param protocolTokenBalance
   * @param blockNumber
   */
  protected abstract getUnderlyingTokenBalances(input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]>

  /**
   * Fetches the LP token to underlying tokens exchange rate
   * @param protocolTokenMetadata
   * @param blockNumber
   */
  protected abstract unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnwrappedTokenExchangeRate[]>

  async getProtocolTokenMovements(input: {
    protocolToken: Erc20Metadata
    filter: {
      fromBlock: number
      toBlock: number
      from?: string
      to?: string
    }
  }): Promise<MovementsByBlock[]> {
    return this.helpers.getErc20Movements(input)
  }
}
