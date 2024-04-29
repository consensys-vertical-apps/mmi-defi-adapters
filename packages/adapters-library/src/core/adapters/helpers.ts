import { getAddress } from 'ethers'
import { Erc20__factory } from '../../contracts'
import { TransferEvent } from '../../contracts/Erc20'
import { Chain } from '../../core/constants/chains'
import { MaxMovementLimitExceededError } from '../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../core/utils/filters'
import { getOnChainTokenMetadata } from '../../core/utils/getTokenMetadata'
import { logger } from '../../core/utils/logger'
import {
  nativeToken,
  nativeTokenAddresses,
} from '../../core/utils/nativeTokens'
import {
  GetEventsInput,
  GetPositionsInput,
  MovementsByBlock,
  ProtocolPosition,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'

export const REAL_ESTATE_TOKEN_METADATA = {
  address: getAddress('0x6b8734ad31D42F5c05A86594314837C416ADA984'),
  name: 'Real Estate USD (REUSD)',
  symbol: 'Real Estate USD (REUSD)',
  decimals: 18,
}

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

    // Always pegged one to one to underlying
    const pricePerShareRaw = BigInt(10 ** protocolToken.decimals)

    return {
      ...protocolToken,
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
    return this.getErc20Movements({
      protocolToken,
      filter: { fromBlock, toBlock, from: userAddress, to: undefined },
      provider,
    })
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
    return this.getErc20Movements({
      protocolToken,
      filter: { fromBlock, toBlock, from: undefined, to: userAddress },
      provider,
    })
  }

  async getTokenMetadata(
    tokenAddress: string,
    chainId: Chain,
    provider: CustomJsonRpcProvider,
  ): Promise<Erc20Metadata> {
    if (
      getAddress(tokenAddress) === REAL_ESTATE_TOKEN_METADATA.address &&
      chainId == Chain.Ethereum
    ) {
      return REAL_ESTATE_TOKEN_METADATA
    }
    if (nativeTokenAddresses.includes(tokenAddress)) {
      return {
        address: getAddress(tokenAddress),
        ...nativeToken[chainId],
      }
    }

    const onChainTokenMetadata = await getOnChainTokenMetadata(
      tokenAddress,
      chainId,
      provider,
    )
    if (onChainTokenMetadata) {
      return onChainTokenMetadata
    }

    const errorMessage = 'Cannot find token metadata for token'
    logger.error({ tokenAddress, chainId }, errorMessage)
    throw new Error(errorMessage)
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
      from?: string
      to?: string
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
