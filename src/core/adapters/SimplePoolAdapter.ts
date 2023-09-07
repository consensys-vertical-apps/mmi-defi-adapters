import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { Erc20__factory } from '../../contracts'
import { TransferEvent } from '../../contracts/Erc20'
import {
  BasePricePerShareToken,
  BaseToken,
  BaseTokenMovement,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetPositionsInput,
  GetPricesInput,
  GetProfitsInput,
  GetTotalValueLockedInput,
  IProtocolAdapter,
  MovementsByBlock,
  ProfitsTokensWithRange,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  TokenBalance,
  TokenType,
} from '../../types/adapter'
import { Json } from '../../types/json'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS'
import { Chain } from '../constants/chains'
import { getBalances } from '../utils/getBalances'
import { ERC20Metadata } from '../utils/getTokenMetadata'

export abstract class SimplePoolAdapter<AdapterMetadata extends Json>
  implements IProtocolAdapter
{
  private metadata: AdapterMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  protected chainId: Chain

  constructor({
    metadata,
    provider,
    chainId,
  }: {
    metadata: AdapterMetadata
    provider: ethers.providers.StaticJsonRpcProvider
    chainId: Chain
  }) {
    this.metadata = metadata
    this.provider = provider
    this.chainId = chainId
  }

  abstract getProtocolDetails(): ProtocolDetails

  abstract getProtocolTokens(): Promise<ERC20Metadata[]>

  abstract getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<ERC20Metadata[]>

  abstract getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
  ): Promise<BaseToken[]>

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    const protocolTokensBalances = await getBalances({
      chainId: this.chainId,
      provider: this.provider,
      userAddress,
      blockNumber,
      tokens: await this.getProtocolTokens(),
    })

    const protocolTokens: ProtocolToken[] = await Promise.all(
      protocolTokensBalances.map(async (protocolTokenBalance) => {
        const underlyingTokenBalances = await this.getUnderlyingTokenBalances(
          protocolTokenBalance,
        )

        return {
          ...protocolTokenBalance,
          type: TokenType.Protocol,
          tokens: underlyingTokenBalances,
        }
      }),
    )

    return protocolTokens
  }

  abstract fetchProtocolTokenMetadata(address: string): Promise<ERC20Metadata>

  abstract getUnderlyingTokenPricesPerShare(
    protocolTokenMetadata: ERC20Metadata,
    blockNumber?: number,
  ): Promise<BasePricePerShareToken[]>

  async getPricePerShare({
    blockNumber,
    protocolTokenAddress,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken> {
    const protocolTokenMetadata = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )

    const underlyingTokenPricesPerShare =
      await this.getUnderlyingTokenPricesPerShare(
        protocolTokenMetadata,
        blockNumber,
      )

    return {
      ...protocolTokenMetadata,
      share: 1,
      type: TokenType.Protocol,
      tokens: underlyingTokenPricesPerShare,
    }
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      protocolTokenAddress,
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
      fromBlock,
      toBlock,
      from: ZERO_ADDRESS,
      to: userAddress,
    })
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      protocolTokenAddress,
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
      fromBlock,
      toBlock,
      from: userAddress,
      to: ZERO_ADDRESS,
    })
  }

  abstract getClaimedRewards(input: GetEventsInput): Promise<MovementsByBlock[]>

  abstract getTotalValueLocked(
    input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]>

  abstract getOneDayProfit(
    input: GetProfitsInput,
  ): Promise<ProfitsTokensWithRange>

  abstract getApy(input: GetApyInput): Promise<ProtocolApyToken>

  abstract getApr(input: GetAprInput): Promise<ProtocolAprToken>

  private async getMovements({
    protocolTokenAddress,
    underlyingTokens,
    fromBlock,
    toBlock,
    from,
    to,
  }: {
    protocolTokenAddress: string
    underlyingTokens: ERC20Metadata[]
    fromBlock: number
    toBlock: number
    from: string
    to: string
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = Erc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const filter = protocolTokenContract.filters.Transfer(from, to)

    const eventResults = await protocolTokenContract.queryFilter<TransferEvent>(
      filter,
      fromBlock,
      toBlock,
    )

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value },
        } = transferEvent

        const protocolTokenPrice = await this.getPricePerShare({
          blockNumber,
          protocolTokenAddress,
        })

        const pricePerShareRaw =
          protocolTokenPrice.tokens?.[0]?.pricePerShareRaw
        if (!pricePerShareRaw) {
          throw new Error('No price for events at this time')
        }

        const movementValueRaw = BigInt(value.toString()) * pricePerShareRaw
        return {
          underlyingTokensMovement: underlyingTokens.reduce(
            (accummulator, currentToken) => {
              return {
                ...accummulator,
                [currentToken.address]: {
                  ...currentToken,
                  movementValueRaw,
                  movementValue: formatUnits(
                    movementValueRaw,
                    currentToken.decimals,
                  ),
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
