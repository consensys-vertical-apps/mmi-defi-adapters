import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  AssetType,
  GetEventsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  BalancerPoolDataQueries__factory,
  Vault__factory,
} from '../../contracts'
import { PoolBalanceChangedEvent } from '../../contracts/Vault'

type ChimpExchangePoolAdapterMetadata = Record<
  string,
  {
    poolId: string
    totalSupplyType: string
    protocolToken: Erc20Metadata
    underlyingTokens: (Erc20Metadata & { index: number })[]
  }
>

const vaultContractAddresses: Partial<Record<Chain, string>> = {
  [Chain.Linea]: getAddress('0x286381aEdd20e51f642fE4A200B5CB2Fe3729695'),
}
const poolDataQueryContractAddresses: Partial<Record<Chain, string>> = {
  [Chain.Linea]: getAddress('0xb2F2537E332F9A1aADa289df9fC770D5120613C9'),
}

export class ChimpExchangePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'pool'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ChimpExchange',
      description: 'ChimpExchange pool adapter',
      siteUrl: 'https://app.chimp.exchange',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const vaultContract = Vault__factory.connect(
      vaultContractAddresses[this.chainId]!,
      this.provider,
    )

    const eventFilter = vaultContract.filters.PoolRegistered()
    const events = await vaultContract.queryFilter(eventFilter)

    const metadataObject: ChimpExchangePoolAdapterMetadata = {}
    await Promise.all(
      events.map(async (event) => {
        const protocolToken = await getTokenMetadata(
          event.args.poolAddress,
          this.chainId,
          this.provider,
        )

        const poolTokens = await vaultContract.getPoolTokens(event.args.poolId)

        const underlyingTokens = await filterMapAsync(
          poolTokens[0],
          async (token, index) => {
            if (getAddress(token) === getAddress(event.args.poolAddress)) {
              return undefined
            }

            const tokenMetadata = await getTokenMetadata(
              token,
              this.chainId,
              this.provider,
            )

            return {
              ...tokenMetadata,
              index,
            }
          },
        )

        metadataObject[protocolToken.address] = {
          poolId: event.args.poolId,
          totalSupplyType: event.args.specialization === 0n ? '2' : '0',
          protocolToken,
          underlyingTokens,
        }
      }),
    )

    return metadataObject
  }

  async getDeposits(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getPoolChangeMovements({
      ...input,
      filterPredicate: (total) => total > 0n,
    })
  }

  async getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getPoolChangeMovements({
      ...input,
      filterPredicate: (total) => total < 0n,
    })
  }

  private async getPoolChangeMovements({
    protocolTokenAddress,
    userAddress,
    fromBlock,
    toBlock,
    filterPredicate,
  }: GetEventsInput & { filterPredicate: (total: bigint) => boolean }): Promise<
    MovementsByBlock[]
  > {
    const { poolId, protocolToken } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    const vaultContract = Vault__factory.connect(
      vaultContractAddresses[this.chainId]!,
      this.provider,
    )

    const filter = vaultContract.filters[
      'PoolBalanceChanged(bytes32,address,address[],int256[],uint256[])'
    ](poolId, userAddress)

    const events =
      await vaultContract.queryFilter<PoolBalanceChangedEvent.Event>(
        filter,
        fromBlock,
        toBlock,
      )

    const movements = await filterMapAsync(events, async (event) => {
      const amounts = event.args.deltas

      const total = amounts.reduce(
        (accumulator, amount) => accumulator + amount,
        0n,
      )

      if (filterPredicate(total)) {
        const tokensData = await filterMapAsync(
          event.args.tokens,
          async (token, index) => {
            if (getAddress(token) === protocolTokenAddress) {
              return undefined
            }

            const tokenData = await getTokenMetadata(
              token,
              this.chainId,
              this.provider,
            )

            const balanceRaw = event.args.deltas[index] ?? 0n
            return {
              ...tokenData,
              balanceRaw: balanceRaw < 0n ? -balanceRaw : balanceRaw,
              type: TokenType.Underlying,
            }
          },
        )

        return {
          transactionHash: event.transactionHash,
          protocolToken,
          tokens: tokensData,
          blockNumber: event.blockNumber,
        }
      }
    })

    return movements
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const poolMetadata = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenConversionRate = await this.unwrapProtocolToken(
      protocolTokenBalance,
      blockNumber,
    )

    const underlyingBalances = poolMetadata.underlyingTokens.map(
      ({ index: _tokenIndex, ...token }) => {
        const unwrappedTokenExchangeRateRaw =
          underlyingTokenConversionRate.find(
            (tokenRate) => tokenRate.address === token.address,
          )!.underlyingRateRaw

        return {
          ...token,
          balanceRaw:
            (unwrappedTokenExchangeRateRaw * protocolTokenBalance.balanceRaw) /
            10n ** BigInt(protocolTokenBalance.decimals),
          type: TokenType.Underlying,
        }
      },
    )

    return underlyingBalances
  }

  async getTotalValueLocked(
    input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const vaultContract = Vault__factory.connect(
      vaultContractAddresses[this.chainId]!,
      this.provider,
    )
    const balancerPoolDataQueriesContract =
      BalancerPoolDataQueries__factory.connect(
        poolDataQueryContractAddresses[this.chainId]!,
        this.provider,
      )

    const protocolTokens = await this.getProtocolTokens()

    return Promise.all(
      protocolTokens.map(async (protocolToken) => {
        const poolMetadata = await this.fetchPoolMetadata(protocolToken.address)

        const [[_poolTokens, poolBalances], [totalSupplyRaw]] =
          await Promise.all([
            vaultContract.getPoolTokens(poolMetadata.poolId, {
              blockTag: input.blockNumber,
            }),
            balancerPoolDataQueriesContract.getTotalSupplyForPools(
              [protocolToken.address],
              [poolMetadata.totalSupplyType],
              {
                blockTag: input.blockNumber,
              },
            ),
          ])

        const tokens = poolMetadata.underlyingTokens.map(
          ({ index: tokenIndex, ...token }) => ({
            ...token,
            totalSupplyRaw: poolBalances[tokenIndex]!,
            type: TokenType.Underlying,
          }),
        )

        return {
          ...protocolToken,
          type: TokenType.Protocol,
          tokens,
          totalSupplyRaw: totalSupplyRaw!,
        }
      }),
    )
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const vaultContract = Vault__factory.connect(
      vaultContractAddresses[this.chainId]!,
      this.provider,
    )
    const balancerPoolDataQueriesContract =
      BalancerPoolDataQueries__factory.connect(
        poolDataQueryContractAddresses[this.chainId]!,
        this.provider,
      )

    const poolMetadata = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    const [_poolTokens, poolBalances] = await vaultContract.getPoolTokens(
      poolMetadata.poolId,
      {
        blockTag: blockNumber,
      },
    )

    const [totalSupplyRaw] =
      await balancerPoolDataQueriesContract.getTotalSupplyForPools(
        [protocolTokenMetadata.address],
        [poolMetadata.totalSupplyType],
        {
          blockTag: blockNumber,
        },
      )

    const underlyingRates = poolMetadata.underlyingTokens.map(
      ({ index: tokenIndex, ...token }) => {
        const underlyingPoolBalance = poolBalances[tokenIndex]!
        const underlyingRateRaw =
          totalSupplyRaw === 0n
            ? 0n
            : underlyingPoolBalance /
              (totalSupplyRaw! / 10n ** BigInt(protocolTokenMetadata.decimals))

        return {
          ...token,
          type: TokenType.Underlying,
          underlyingRateRaw,
        }
      },
    )

    return underlyingRates
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return underlyingTokens.map(({ index: _tokenIndex, ...token }) => token)
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
