import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'

import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
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
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'

import { Erc20, Erc20__factory } from '../../../../contracts'
import { filterMapAsync } from '../../../../core/utils/filters'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Vault__factory } from '../../contracts'

const vaultAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'

type AdditionalMetadata = { poolId: string }

export class BalancerV2PoolAdapter implements IProtocolAdapter {
  productId = 'pool'
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

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'BalancerV2',
      description: 'BalancerV2 defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const vault = Vault__factory.connect(vaultAddress, this.provider)

    const filter = await vault.filters.PoolRegistered()

    const poolRegisteredEvents = await vault.queryFilter(filter, 0, 'latest')

    const poolAddressAndId = poolRegisteredEvents.map((event) => {
      return {
        poolAddress: event.args.poolAddress,
        poolId: event.args.poolId,
      }
    })

    const protocolTokens = await filterMapAsync(
      poolAddressAndId,
      async ({ poolAddress, poolId }) => {
        const underlyingTokens = await vault
          .getPoolTokens(poolId)
          .catch((e) => {
            return undefined
          })

        if (!underlyingTokens) {
          return undefined
        }

        const protocolTokenMetadata = await this.helpers
          .getTokenMetadata(getAddress(poolAddress))
          .catch((e) => {
            return undefined
          })

        if (!protocolTokenMetadata) {
          return undefined
        }

        const underlyingTokenAddresses = await Promise.all(
          underlyingTokens.tokens.map((underlyingToken) =>
            this.helpers
              .getTokenMetadata(getAddress(underlyingToken))
              .catch((e) => {
                return undefined
              }),
          ),
        )

        return {
          ...protocolTokenMetadata,
          poolId,
          underlyingTokens: underlyingTokenAddresses.filter(
            Boolean,
          ) as Erc20Metadata[],
        }
      },
    )

    return protocolTokens
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
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
    throw new NotImplementedError()
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    // Fetch protocol token details
    const { underlyingTokens, poolId, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    // Connect to Vault contract
    const vault = Vault__factory.connect(vaultAddress, this.provider)

    // Fetch underlying token balances from the pool
    const tokenData = await vault.getPoolTokens(poolId, {
      blockTag: blockNumber,
    })

    // Connect to the LP token contract
    const lpTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    // Determine if the protocol token is part of the underlying tokens
    const protocolTokenIndex = underlyingTokens.findIndex(
      (token) => token.address === protocolToken.address,
    )

    // Fetch total supply of the LP token
    const totalSupply = await lpTokenContract.totalSupply({
      blockTag: blockNumber,
    })

    // Return an empty response if total supply is zero
    if (totalSupply === 0n) {
      return {
        ...protocolToken,
        baseRate: 1,
        type: TokenType.Protocol,
        tokens: [],
      }
    }

    // Calculate adjusted supply if the protocol token is part of underlying tokens
    const burnedSupply =
      protocolTokenIndex !== -1
        ? tokenData.balances[protocolTokenIndex] || 0n
        : 0n
    const adjustedSupply = totalSupply - burnedSupply

    const calculateTokenRates = (
      omitIndex: number | null,
      supply: bigint,
    ): UnwrappedTokenExchangeRate[] => {
      return tokenData.tokens
        .map((underlyingTokenAddress, index) => {
          const balance = tokenData.balances[index]
          if (!balance || index === omitIndex) return undefined

          const conversionRate = BigInt(
            Math.round(
              (Number(balance) * 10 ** protocolToken.decimals) / Number(supply),
            ),
          )

          if (conversionRate === 0n) return undefined

          const underlyingToken = underlyingTokens.find(
            (token) => token.address === underlyingTokenAddress,
          )

          return {
            type: TokenType.Underlying,
            underlyingRateRaw: conversionRate,
            ...underlyingToken,
          }
        })
        .filter(Boolean) as UnwrappedTokenExchangeRate[]
    }

    // Calculate token rates based on whether the protocol token is part of the underlying tokens
    const underlyingTokenRates = calculateTokenRates(
      protocolTokenIndex,
      adjustedSupply,
    )

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: underlyingTokenRates,
    }
  }
}
