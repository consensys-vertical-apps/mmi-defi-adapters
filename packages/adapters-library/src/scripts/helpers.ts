import { getAddress } from 'ethers'
import { Erc20__factory } from '../contracts'
import { TransferEvent } from '../contracts/Erc20'
import { ZERO_ADDRESS } from '../core/constants/ZERO_ADDRESS'
import { Chain } from '../core/constants/chains'
import { MaxMovementLimitExceededError } from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../core/utils/filters'
import { getOnChainTokenMetadata } from '../core/utils/getTokenMetadata'
import { logger } from '../core/utils/logger'
import { nativeToken, nativeTokenAddresses } from '../core/utils/nativeTokens'
import { JsonMetadata, ProtocolToken } from '../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  MovementsByBlock,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
} from '../types/adapter'
import { Erc20Metadata } from '../types/erc20Metadata'

export const REAL_ESTATE_TOKEN_METADATA = {
  address: getAddress('0x6b8734ad31D42F5c05A86594314837C416ADA984'),
  name: 'Real Estate USD (REUSD)',
  symbol: 'Real Estate USD (REUSD)',
  decimals: 18,
}

export class Helpers {
  provider: CustomJsonRpcProvider
  chainId: Chain

  constructor({
    provider,
    chainId,
  }: {
    provider: CustomJsonRpcProvider
    chainId: Chain
  }) {
    this.provider = provider
    this.chainId = chainId
  }

  async getProtocolTokenByAddress<AdditionalMetadata extends JsonMetadata>({
    protocolTokens,
    protocolTokenAddress,
  }: {
    protocolTokens: ProtocolToken<AdditionalMetadata>[]
    protocolTokenAddress: string
  }): Promise<ProtocolToken<AdditionalMetadata>> {
    const protocolToken = protocolTokens.find(
      (token) => token.address === protocolTokenAddress,
    )
    if (!protocolToken) {
      // Ideally we want to throw here but when filterProtocolToken is included in defiProvider requests it will throw which makes the snapshots include many errors which is confusing
      // We need to improve the flows when filterProtocolToken is included in the request
      // JP to discuss with Bernardo

      return {} as ProtocolToken<AdditionalMetadata>
    }
    return protocolToken
  }

  async getBalanceOfTokens({
    userAddress,
    protocolTokens,
    protocolTokenAddresses,
    blockNumber,
  }: GetPositionsInput & {
    protocolTokens: Erc20Metadata[]
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

      return {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        balanceRaw: balanceOf,
        type: TokenType.Protocol,
      }
    })
  }

  /**
   * Unwraps the protocol token to its underlying token while accounting for decimal differences.
   *
   * This method resolves a 1:1 unwrap rate between the protocol token and it's underlying,
   * even though they have different decimal places. It uses the underlying token's decimals to adjust the unwrap rate.
   *
   * @returns {Promise<UnwrapExchangeRate>} A promise that resolves to an `UnwrapExchangeRate` object,
   * containing the details of the unwrapped tokens, including adjusted rates to account for decimal differences.
   *
   * @throws {Error} If there is an issue retrieving the protocol or underlying token information.
   */
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

  async unwrapTokenAsRatio({
    protocolToken,
    underlyingTokens,
    blockNumber,
  }: {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
    blockNumber?: number
  }): Promise<UnwrapExchangeRate> {
    if (underlyingTokens.length !== 1) {
      throw new Error('Missing Underlying tokens')
    }

    const protocolTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const protocolTokenTotalSupply = await protocolTokenContract.totalSupply({
      blockTag: blockNumber,
    })

    const prices = await Promise.all(
      underlyingTokens.map(async (underlyingToken) => {
        const underlyingTokenContract = Erc20__factory.connect(
          underlyingToken.address,
          this.provider,
        )

        if (
          underlyingToken.address ===
          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        ) {
          const reserve = this.provider.getBalance(
            protocolToken.address,
            blockNumber,
          )
          return BigInt(
            Math.round(
              (Number(reserve) * 10 ** protocolToken.decimals) /
                Number(protocolTokenTotalSupply),
            ),
          )
        }

        const reserve = await underlyingTokenContract.balanceOf(
          protocolToken.address,
          {
            blockTag: blockNumber,
          },
        )

        // AssetReserve / ProtocolTokenSupply / 10 ** ProtocolTokenDecimals
        // Moved last division as multiplication at the top
        // Division sometimes is not exact, so it needs rounding
        return BigInt(
          Math.round(
            (Number(reserve) * 10 ** protocolToken.decimals) /
              Number(protocolTokenTotalSupply),
          ),
        )
      }),
    )

    return {
      address: protocolToken.address,
      name: protocolToken.name,
      symbol: protocolToken.symbol,
      decimals: protocolToken.decimals,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: prices.map((price, index) => {
        return {
          ...underlyingTokens[index]!,
          type: TokenType.Underlying,
          underlyingRateRaw: price,
        }
      }),
    }
  }
  async unwrapTokenWithRates({
    protocolToken,
    underlyingTokens,
    underlyingRates,
  }: {
    protocolToken: Erc20Metadata
    underlyingRates: bigint[]
    underlyingTokens: Erc20Metadata[]
  }): Promise<UnwrapExchangeRate> {
    if (underlyingTokens.length !== underlyingRates.length) {
      throw new Error('Underlying rate mismatch')
    }

    return {
      address: protocolToken.address,
      name: protocolToken.name,
      symbol: protocolToken.symbol,
      decimals: protocolToken.decimals,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: underlyingRates.map((price, index) => {
        return {
          ...underlyingTokens[index]!,
          type: TokenType.Underlying,
          underlyingRateRaw: price,
        }
      }),
    }
  }

  async tvl({
    protocolTokens,
    filterProtocolTokenAddresses,
    blockNumber,
  }: {
    protocolTokens: Erc20Metadata[]
    filterProtocolTokenAddresses: string[] | undefined
    blockNumber: number | undefined
  }): Promise<ProtocolTokenTvl[]> {
    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        filterProtocolTokenAddresses &&
        !filterProtocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const protocolTokenContact = Erc20__factory.connect(
        protocolToken.address,
        this.provider,
      )

      const protocolTokenTotalSupply = await protocolTokenContact.totalSupply({
        blockTag: blockNumber,
      })
      return {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        type: TokenType.Protocol,
        totalSupplyRaw: protocolTokenTotalSupply,
      }
    })
  }

  async tvlUsingUnderlyingTokenBalances({
    protocolTokens,
    filterProtocolTokenAddresses,
    blockNumber,
  }: {
    protocolTokens: (Erc20Metadata & { underlyingTokens: Erc20Metadata[] })[]
    filterProtocolTokenAddresses: string[] | undefined
    blockNumber: number | undefined
  }): Promise<ProtocolTokenTvl[]> {
    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        filterProtocolTokenAddresses &&
        !filterProtocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const protocolTokenContact = Erc20__factory.connect(
        protocolToken.address,
        this.provider,
      )

      const underlyingTokens = protocolToken.underlyingTokens

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
        name: protocolToken.name,
        address: protocolToken.address,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        type: TokenType.Protocol,
        totalSupplyRaw: protocolTokenTotalSupply,
        tokens,
      }
    })
  }

  async borrows({
    protocolToken,
    filter: { fromBlock, toBlock, userAddress },
  }: {
    protocolToken: Erc20Metadata & { tokenId?: string }
    filter: {
      fromBlock: number
      toBlock: number
      userAddress: string
    }
  }): Promise<MovementsByBlock[]> {
    return this.getErc20Movements({
      protocolToken,
      filter: {
        fromBlock,
        toBlock,
        from: undefined,
        to: userAddress,
      },
    })
  }

  async repays({
    protocolToken,
    filter: { fromBlock, toBlock, userAddress },
  }: {
    protocolToken: Erc20Metadata & { tokenId?: string }
    filter: {
      fromBlock: number
      toBlock: number
      userAddress: string
    }
  }): Promise<MovementsByBlock[]> {
    return this.getErc20Movements({
      protocolToken,
      filter: {
        fromBlock,
        toBlock,
        from: userAddress,
        to: undefined,
      },
    })
  }

  withdrawals({
    protocolToken,
    filter: { fromBlock, toBlock, userAddress },
  }: {
    protocolToken: Erc20Metadata & { tokenId?: string }
    filter: {
      fromBlock: number
      toBlock: number
      userAddress: string
    }
  }): Promise<MovementsByBlock[]> {
    return this.getErc20Movements({
      protocolToken,
      filter: { fromBlock, toBlock, from: userAddress, to: undefined },
    })
  }

  deposits({
    protocolToken,
    filter: { fromBlock, toBlock, userAddress },
  }: {
    protocolToken: Erc20Metadata & { tokenId?: string }
    filter: {
      fromBlock: number
      toBlock: number
      userAddress: string
    }
  }): Promise<MovementsByBlock[]> {
    return this.getErc20Movements({
      protocolToken,
      filter: { fromBlock, toBlock, from: undefined, to: userAddress },
    })
  }

  async getTokenMetadata(tokenAddress: string): Promise<Erc20Metadata> {
    if (
      getAddress(tokenAddress) === REAL_ESTATE_TOKEN_METADATA.address &&
      this.chainId === Chain.Ethereum
    ) {
      return REAL_ESTATE_TOKEN_METADATA
    }
    if (nativeTokenAddresses.includes(tokenAddress)) {
      return {
        address: getAddress(tokenAddress),
        ...nativeToken[this.chainId],
      }
    }

    const onChainTokenMetadata = await getOnChainTokenMetadata(
      tokenAddress,
      this.chainId,
      this.provider,
    )
    if (onChainTokenMetadata) {
      return onChainTokenMetadata
    }

    const errorMessage = 'Cannot find token metadata for token'
    logger.error({ tokenAddress, chainId: this.chainId }, errorMessage)
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

  async getErc20Movements({
    protocolToken,
    filter: { fromBlock, toBlock, from, to },
  }: {
    protocolToken: Erc20Metadata & { tokenId?: string }
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
            tokenId: protocolToken.tokenId,
          },
          tokens: [
            {
              address: protocolToken.address,
              name: protocolToken.name,
              symbol: protocolToken.symbol,
              decimals: protocolToken.decimals,
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
