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
  ProtocolRewardPosition,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { Chain } from '../constants/chains'
import { aggregateTrades } from '../utils/aggregateTrades'
import { CustomJsonRpcProvider } from '../utils/customJsonRpcProvider'
import { getAddressesBalances } from '../utils/getAddressesBalances'
import { getBalances } from '../utils/getBalances'
import { formatProtocolTokenArrayToMap } from '../utils/protocolTokenToMap'

export abstract class SimplePoolAdapter implements IProtocolAdapter {
  chainId: Chain
  protocolId: Protocol
  abstract productId: string

  protected provider: CustomJsonRpcProvider

  constructor({ provider, chainId, protocolId }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
  }

  abstract getProtocolDetails(): ProtocolDetails

  abstract getProtocolTokens(): Promise<Erc20Metadata[]>

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokensBalances = await getBalances({
      chainId: this.chainId,
      provider: this.provider,
      userAddress,
      blockNumber,
      tokens: await this.getProtocolTokens(),
    })

    const protocolTokens: ProtocolPosition[] = await Promise.all(
      protocolTokensBalances.map(async (protocolTokenBalance) => {
        const underlyingTokenBalances = await this.getUnderlyingTokenBalances({
          userAddress,
          protocolTokenBalance,
          blockNumber,
        })

        return {
          ...protocolTokenBalance,
          type: TokenType.Protocol,
          tokens: underlyingTokenBalances,
        }
      }),
    )

    return protocolTokens
  }

  abstract getClaimableRewards({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolRewardPosition[]>

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

  abstract getClaimedRewards(input: GetEventsInput): Promise<MovementsByBlock[]>

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

        const [protocolTokenTotalSupply, underlyingTokenBalances] =
          await Promise.all([
            protocolTokenContact.totalSupply({ blockTag: blockNumber }),
            getAddressesBalances({
              chainId: this.chainId,
              provider: this.provider,
              addresses: [protocolTokenMetadata.address],
              tokens: underlyingTokens.map((token) => token.address),
              blockNumber,
            }),
          ])

        return {
          ...protocolTokenMetadata,
          type: TokenType.Protocol,
          totalSupplyRaw: protocolTokenTotalSupply,
          tokens: underlyingTokens.map((underlyingToken) => {
            const balance =
              underlyingTokenBalances[protocolTokenMetadata.address]?.[
                underlyingToken.address
              ]

            return {
              ...underlyingToken,
              type: TokenType.Underlying,
              totalSupplyRaw: balance ?? 0n,
            }
          }),
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
  abstract getRewardApy(input: GetApyInput): Promise<ProtocolTokenApy>
  abstract getRewardApr(input: GetAprInput): Promise<ProtocolTokenApr>

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
                BigInt(10 ** currentTokenPrice.decimals)

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
