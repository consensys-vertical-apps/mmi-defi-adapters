import { formatUnits } from 'ethers'
import { Protocol } from '../../adapters/protocols'
import { Erc20__factory } from '../../contracts'
import { TransferEvent } from '../../contracts/Erc20'
import {
  UnderlyingTokenRate,
  Underlying,
  BaseTokenMovement,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetPositionsInput,
  GetConversionRateInput,
  GetProfitsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProfitsWithRange,
  ProtocolAdapterParams,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolDetails,
  ProtocolTokenUnderlyingRate,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { ResolveUnderlyingPositions } from '../decorators/resolveUnderlyingPositions'
import { MaxMovementLimitExceededError } from '../errors/errors'
import { aggregateTrades } from '../utils/aggregateTrades'
import { CustomJsonRpcProvider } from '../utils/customJsonRpcProvider'
import { filterMapAsync } from '../utils/filters'
import { formatProtocolTokenArrayToMap } from '../utils/protocolTokenToMap'

export abstract class SimplePoolAdapter implements IProtocolAdapter {
  chainId: Chain
  protocolId: Protocol
  abstract productId: string

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

  @ResolveUnderlyingPositions
  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      const tokenContract = Erc20__factory.connect(
        protocolToken.address,
        this.provider,
      )

      const balanceOf = await tokenContract
        .balanceOf(userAddress, {
          blockTag: blockNumber,
        })
        .catch(() => 0n) // contract might not be deployed at requested blockNumber

      if (balanceOf == 0n) {
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

  async getProtocolTokenToUnderlyingTokenRate({
    blockNumber,
    protocolTokenAddress,
  }: GetConversionRateInput): Promise<ProtocolTokenUnderlyingRate> {
    const protocolTokenMetadata = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )

    const underlyingTokenConversionRate =
      await this.getUnderlyingTokenConversionRate(
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
    return await this.getMovements({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(
        protocolTokenAddress,
      ),
      filter: {
        smartContractAddress: protocolTokenAddress,
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
    return await this.getMovements({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(
        protocolTokenAddress,
      ),
      filter: {
        smartContractAddress: protocolTokenAddress,
        fromBlock,
        toBlock,
        from: userAddress,
        to: undefined,
      },
    })
  }

  async getTotalValueLocked({
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return Promise.all(
      protocolTokens.map(async (protocolTokenMetadata) => {
        const protocolTokenContact = Erc20__factory.connect(
          protocolTokenMetadata.address,
          this.provider,
        )

        const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
          protocolTokenMetadata.address,
        )

        const underlyingTokenBalances = filterMapAsync(
          underlyingTokens,
          async (underlyingToken) => {
            if (underlyingToken.address == ZERO_ADDRESS) {
              const balanceOf = await this.provider
                .getBalance(protocolTokenMetadata.address, blockNumber)
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
              .balanceOf(protocolTokenMetadata.address, {
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
          ...protocolTokenMetadata,
          type: TokenType.Protocol,
          totalSupplyRaw: protocolTokenTotalSupply,
          tokens,
        }
      }),
    )
  }

  async getProfits({
    userAddress,
    fromBlock,
    toBlock,
  }: GetProfitsInput): Promise<ProfitsWithRange> {
    const [endPositionValues, startPositionValues] = await Promise.all([
      this.getPositions({
        userAddress,
        blockNumber: toBlock,
      }).then(formatProtocolTokenArrayToMap),
      this.getPositions({
        userAddress,
        blockNumber: fromBlock,
      }).then(formatProtocolTokenArrayToMap),
    ])

    const tokens = await Promise.all(
      Object.values(endPositionValues).map(
        async ({
          protocolTokenMetadata,
          underlyingTokenPositions: underlyingEndPositions,
        }) => {
          const getEventsInput: GetEventsInput = {
            userAddress,
            protocolTokenAddress: protocolTokenMetadata.address,
            fromBlock,
            toBlock,
          }

          const [withdrawals, deposits] = await Promise.all([
            this.getWithdrawals(getEventsInput).then(aggregateTrades),
            this.getDeposits(getEventsInput).then(aggregateTrades),
          ])

          return {
            ...protocolTokenMetadata,
            type: TokenType.Protocol,
            tokens: Object.values(underlyingEndPositions).map(
              ({
                address,
                name,
                symbol,
                decimals,
                balanceRaw: endPositionValueRaw,
              }) => {
                const startPositionValueRaw =
                  startPositionValues[protocolTokenMetadata.address]
                    ?.underlyingTokenPositions[address]?.balanceRaw ?? 0n

                const calculationData = {
                  withdrawalsRaw: withdrawals[address] ?? 0n,
                  depositsRaw: deposits[address] ?? 0n,
                  endPositionValueRaw: endPositionValueRaw ?? 0n,
                  startPositionValueRaw,
                }

                let profitRaw =
                  calculationData.endPositionValueRaw +
                  calculationData.withdrawalsRaw -
                  calculationData.depositsRaw -
                  calculationData.startPositionValueRaw

                if (
                  this.getProtocolDetails().positionType === PositionType.Borrow
                ) {
                  profitRaw *= -1n
                }

                return {
                  address,
                  name,
                  symbol,
                  decimals,
                  profitRaw,
                  type: TokenType.Underlying,
                  calculationData: {
                    withdrawalsRaw: withdrawals[address] ?? 0n,
                    withdrawals: formatUnits(
                      withdrawals[address] ?? 0n,
                      decimals,
                    ),
                    depositsRaw: deposits[address] ?? 0n,
                    deposits: formatUnits(deposits[address] ?? 0n, decimals),
                    startPositionValueRaw: startPositionValueRaw ?? 0n,
                    startPositionValue: formatUnits(
                      startPositionValueRaw ?? 0n,
                      decimals,
                    ),
                    endPositionValueRaw,
                    endPositionValue: formatUnits(
                      endPositionValueRaw ?? 0n,
                      decimals,
                    ),
                  },
                }
              },
            ),
          }
        },
      ),
    )

    return { tokens, fromBlock, toBlock }
  }

  abstract getApy(input: GetApyInput): Promise<ProtocolTokenApy>
  abstract getApr(input: GetAprInput): Promise<ProtocolTokenApr>

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
  protected abstract getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnderlyingTokenRate[]>

  /**
   * Util used by both getDeposits and getWithdrawals
   */
  async getMovements({
    protocolToken,
    underlyingTokens,
    filter: { smartContractAddress, fromBlock, toBlock, from, to },
  }: {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
    filter: {
      smartContractAddress: string
      fromBlock: number
      toBlock: number
      from?: string
      to?: string
    }
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = Erc20__factory.connect(
      smartContractAddress,
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

        const protocolTokenPrice =
          await this.getProtocolTokenToUnderlyingTokenRate({
            blockNumber,
            protocolTokenAddress: protocolToken.address,
          })

        return {
          protocolToken: {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          },
          underlyingTokensMovement: underlyingTokens.reduce(
            (accumulator, currentToken) => {
              const currentTokenPrice = protocolTokenPrice.tokens?.find(
                (price) => price.address === currentToken.address,
              )

              if (!currentTokenPrice) {
                throw new Error('No price for underlying token at this time')
              }

              const movementValueRaw =
                (protocolTokenMovementValueRaw *
                  currentTokenPrice.underlyingRateRaw) /
                BigInt(10 ** protocolToken.decimals)

              return {
                ...accumulator,

                [currentToken.address]: {
                  ...currentToken,
                  transactionHash,
                  movementValueRaw,
                },
              }
            },
            {} as Record<string, BaseTokenMovement>,
          ),
          blockNumber,
        }
      }),
    )
  }
}
