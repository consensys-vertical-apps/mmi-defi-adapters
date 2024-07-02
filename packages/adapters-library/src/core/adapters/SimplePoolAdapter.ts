import { Protocol } from '../../adapters/protocols'
import { Erc20__factory } from '../../contracts'
import { TransferEvent } from '../../contracts/Erc20'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
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

export abstract class SimplePoolAdapter implements IProtocolAdapter {
  chainId: Chain
  protocolId: Protocol
  abstract productId: string

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
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  abstract getProtocolDetails(): ProtocolDetails

  abstract getProtocolTokens(): Promise<Erc20Metadata[]>

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    return filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const tokenContract = Erc20__factory.connect(
        protocolToken.address,
        this.provider,
      )

      const balanceOf = await tokenContract
        .balanceOf(userAddress, {
          blockTag: blockNumber,
        })
        .catch(() => 0n) // contract might not be deployed at requested blockNumber

      if (balanceOf === 0n) {
        return undefined
      }

      const underlyingTokenBalances = await this.getUnderlyingTokenBalances({
        userAddress,
        protocolTokenBalance: { balanceRaw: balanceOf, ...protocolToken },
        blockNumber,
      })

      return {
        ...protocolToken,
        balanceRaw: balanceOf,
        type: TokenType.Protocol,
        tokens: underlyingTokenBalances,
      }
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

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getProtocolTokenMovements({
      protocolToken:
        await this.fetchProtocolTokenMetadata(protocolTokenAddress),

      filter: {
        fromBlock,
        toBlock,
        from: undefined,
        to: userAddress,
      },
    })
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getProtocolTokenMovements({
      protocolToken:
        await this.fetchProtocolTokenMetadata(protocolTokenAddress),

      filter: {
        fromBlock,
        toBlock,
        from: userAddress,
        to: undefined,
      },
    })
  }

  async getBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getProtocolTokenMovements({
      protocolToken:
        await this.fetchProtocolTokenMetadata(protocolTokenAddress),

      filter: {
        fromBlock,
        toBlock,
        from: undefined,
        to: userAddress,
      },
    })
  }

  async getRepays({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getProtocolTokenMovements({
      protocolToken:
        await this.fetchProtocolTokenMetadata(protocolTokenAddress),

      filter: {
        fromBlock,
        toBlock,
        from: userAddress,
        to: undefined,
      },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const protocolTokenContact = Erc20__factory.connect(
        protocolToken.address,
        this.provider,
      )

      const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
        protocolToken.address,
      )

      const underlyingTokenBalances = filterMapAsync(
        underlyingTokens,
        async (underlyingToken) => {
          if (underlyingToken.address === ZERO_ADDRESS) {
            const balanceOf = await this.provider
              .getBalance(protocolToken.address, blockNumber)
              .catch(() => 0n)
            return {
              ...underlyingToken,
              totalSupplyRaw: balanceOf,
              type: TokenType.Underlying,
            }
          }

          const contract = Erc20__factory.connect(
            underlyingToken.address,
            this.provider,
          )

          const balanceOf = await contract
            .balanceOf(protocolToken.address, {
              blockTag: blockNumber,
            })
            .catch(() => 0n)

          return {
            ...underlyingToken,
            totalSupplyRaw: balanceOf,
            type: TokenType.Underlying,
          }
        },
      )

      const [protocolTokenTotalSupply, tokens] = await Promise.all([
        protocolTokenContact.totalSupply({ blockTag: blockNumber }),
        underlyingTokenBalances,
      ])

      return {
        ...protocolToken,
        type: TokenType.Protocol,
        totalSupplyRaw: protocolTokenTotalSupply,
        tokens,
      }
    })
  }

  /**
   * Fetches the protocol-token metadata
   * @param protocolTokenAddress
   */
  protected abstract fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata>

  /**
   * Fetches the protocol-token's underlying token details
   * @param protocolTokenAddress
   */
  protected abstract fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]>

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

  /**
   * Util used by both getDeposits and getWithdrawals
   */

  async getProtocolTokenMovements({
    protocolToken,
    filter: { fromBlock, toBlock, from, to },
  }: {
    protocolToken: Erc20Metadata
    filter: {
      fromBlock: number
      toBlock: number
      from?: string
      to?: string
    }
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const filter = protocolTokenContract.filters.Transfer(from, to)

    const eventResults =
      await protocolTokenContract.queryFilter<TransferEvent.Event>(
        filter,
        fromBlock,
        toBlock,
      )

    // Temp fix to avoid timeouts
    // Remember these are on per pool basis.
    // We should monitor number
    // 20 interactions with same pool feels a healthy limit
    if (eventResults.length > 20) {
      throw new MaxMovementLimitExceededError()
    }

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value: protocolTokenMovementValueRaw },
          transactionHash,
        } = transferEvent

        return {
          transactionHash,
          protocolToken: {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          },
          tokens: [
            {
              ...protocolToken,
              balanceRaw: protocolTokenMovementValueRaw,
              type: TokenType.Underlying,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )
  }
}
