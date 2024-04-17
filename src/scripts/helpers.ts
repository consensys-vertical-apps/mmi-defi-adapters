import { Erc20__factory } from '../contracts'
import { TransferEvent } from '../contracts/Erc20'
import { ZERO_ADDRESS } from '../core/constants/ZERO_ADDRESS'
import {
  MaxMovementLimitExceededError,
  NotImplementedError,
} from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../core/utils/filters'
import {
  GetEventsInput,
  GetPositionsInput,
  MovementsByBlock,
  ProtocolPosition,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
} from '../types/adapter'
import { Erc20Metadata } from '../types/erc20Metadata'

class Helpers {
  async getBalanceOfTokens({
    userAddress,
    protocolTokens,
    protocolTokenAddresses,
    blockNumber,
    provider,
  }: GetPositionsInput & {
    protocolTokens: Erc20Metadata[]
    provider: CustomJsonRpcProvider
  }): Promise<ProtocolPosition[]> {
    return filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const tokenContract = Erc20__factory.connect(
        protocolToken.address,
        provider,
      )

      const balanceOf = await tokenContract
        .balanceOf(userAddress, {
          blockTag: blockNumber,
        })
        .catch(() => 0n) // contract might not be deployed at requested blockNumber

      if (balanceOf == 0n) {
        return undefined
      }

      return {
        ...protocolToken,
        balanceRaw: balanceOf,
        type: TokenType.Protocol,
      }
    })
  }

  unwrapOneToOne({
    protocolToken,
    underlyingTokens,
  }: {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }): UnwrapExchangeRate {
    if (underlyingTokens.length !== 1) {
      throw new Error('Cannot map underlying token')
    }
    const underlyingToken = underlyingTokens[0]!

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw: 1n,
        },
      ],
    }
  }

  withdrawals({
    protocolToken,
    filter: { fromBlock, toBlock, userAddress },
    provider,
  }: {
    protocolToken: Erc20Metadata & { tokenId?: string }
    filter: {
      fromBlock: number
      toBlock: number
      userAddress: string
    }
    provider: CustomJsonRpcProvider
  }): Promise<MovementsByBlock[]> {
    this.getErc20Movements({
      protocolToken,
      filter: { fromBlock, toBlock, from: userAddress, to: ZERO_ADDRESS },
      provider,
    })
    throw new NotImplementedError()
  }

  deposits({
    protocolToken,
    filter: { fromBlock, toBlock, userAddress },
    provider,
  }: {
    protocolToken: Erc20Metadata & { tokenId?: string }
    filter: {
      fromBlock: number
      toBlock: number
      userAddress: string
    }
    provider: CustomJsonRpcProvider
  }): Promise<MovementsByBlock[]> {
    this.getErc20Movements({
      protocolToken,
      filter: { fromBlock, toBlock, from: ZERO_ADDRESS, to: userAddress },
      provider,
    })
    throw new NotImplementedError()
  }

  getTokenMetadata(): any {
    throw new NotImplementedError()
  }

  async getPositionsAndRewards(
    userAddress: string,
    positionsWithoutRewardsPromise: Promise<ProtocolPosition[]>,
    getRewardPositions: ({
      userAddress,
      protocolTokenAddress,
      blockNumber,
    }: {
      userAddress: string
      blockNumber?: number
      protocolTokenAddress: string
      tokenIds?: string[]
    }) => Promise<Underlying[]>,
    blockNumber?: number,
  ): Promise<ProtocolPosition[]> {
    const positionsWithoutRewards = await positionsWithoutRewardsPromise

    await Promise.all(
      positionsWithoutRewards.map(async (position) => {
        const rewardTokensPositions = await getRewardPositions({
          userAddress,
          blockNumber,
          protocolTokenAddress: position.address,
        })

        position.tokens = [...(position.tokens ?? []), ...rewardTokensPositions]
      }),
    )

    return positionsWithoutRewards
  }

  async getWithdrawalsAndRewardWithdrawals(
    userAddress: string,
    protocolTokenAddress: string,
    fromBlock: number,
    toBlock: number,
    getWithdrawalsWithoutRewards: ({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
    }: GetEventsInput) => Promise<MovementsByBlock[]>,
    getRewardWithdrawals: ({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
    }: GetEventsInput) => Promise<MovementsByBlock[]>,
    blockNumber?: number,
  ): Promise<MovementsByBlock[]> {
    const withdrawalMethods = [
      getWithdrawalsWithoutRewards,
      getRewardWithdrawals,
    ]

    const withdrawals = await Promise.all(
      withdrawalMethods.map(async (method) => {
        return await method.call(this, {
          userAddress,
          protocolTokenAddress,
          fromBlock,
          toBlock,
        })
      }),
    )

    return withdrawals
      .flat()
      .filter(
        (withdrawal): withdrawal is MovementsByBlock =>
          withdrawal !== undefined,
      )
  }

  private async getErc20Movements({
    protocolToken,
    filter: { fromBlock, toBlock, from, to },
    provider,
  }: {
    protocolToken: Erc20Metadata & { tokenId?: string }
    filter: {
      fromBlock: number
      toBlock: number
      from: string
      to: string
    }
    provider: CustomJsonRpcProvider
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = Erc20__factory.connect(
      protocolToken.address,
      provider,
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
          protocolToken,
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

export const helpers = new Helpers()
