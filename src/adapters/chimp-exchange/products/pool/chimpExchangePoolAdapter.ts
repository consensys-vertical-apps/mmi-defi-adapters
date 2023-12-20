import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  ProtocolDetails,
  PositionType,
  GetAprInput,
  GetApyInput,
  GetTotalValueLockedInput,
  TokenBalance,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenTvl,
  UnderlyingTokenRate,
  Underlying,
  GetEventsInput,
  TokenType,
  MovementsByBlock,
  GetPositionsInput,
  ProtocolPosition,
  UnderlyingTokenTvl,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  Vault__factory,
  Pool__factory,
  BalancerPoolDataQueries__factory,
} from '../../contracts'
import { PoolBalanceChangedEvent } from '../../contracts/Vault'

type ChimpExchangePoolAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export class ChimpExchangePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'pool'
  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ChimpExchange',
      description: 'ChimpExchange pool adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
  /**
   * Update me.
   * Add logic to build protocol token metadata
   * For context see dashboard example ./dashboard.png
   * We need protocol token names, decimals, and also linked underlying tokens
   */
  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: '0x286381aEdd20e51f642fE4A200B5CB2Fe3729695',
    }
    const vaultContract = Vault__factory.connect(
      contractAddresses[this.chainId]!,
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
        const underLyingtokensData = poolTokens[0].filter(
          (token) =>
            token.toLowerCase() !== event.args.poolAddress.toLowerCase(),
        )
        const underlyings = await Promise.all(
          underLyingtokensData.map(async (underlying) => {
            return await getTokenMetadata(
              underlying,
              this.chainId,
              this.provider,
            )
          }),
        )
        metadataObject[event.args.poolAddress.toLowerCase()] = {
          protocolToken,
          underlyingTokens: underlyings,
        }
      }),
    )
    return metadataObject
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: '0x286381aEdd20e51f642fE4A200B5CB2Fe3729695',
    }
    const protocolToken = await this.fetchProtocolTokenMetadata(
      _input.protocolTokenAddress,
    )
    const vaultContract = Vault__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )
    const poolContract = Pool__factory.connect(
      _input.protocolTokenAddress,
      this.provider,
    )
    const poolId = await poolContract.getPoolId()
    const filter = vaultContract.filters[
      'PoolBalanceChanged(bytes32,address,address[],int256[],uint256[])'
    ](poolId, _input.userAddress)
    const events =
      await vaultContract.queryFilter<PoolBalanceChangedEvent.Event>(
        filter,
        _input.fromBlock,
        _input.toBlock,
      )
    const response: MovementsByBlock[] = []
    await Promise.all(
      events.map(async (event) => {
        const amounts = event.args.deltas
        const total = amounts.reduce(
          (sum, amount) => (sum = sum + parseFloat(amount.toString())),
          0,
        )
        if (total > 0) {
          const tokensData: Underlying[] = []
          await Promise.all(
            event.args.tokens.map(async (token, index) => {
              if (
                token.toLowerCase() !==
                _input.protocolTokenAddress.toLocaleLowerCase()
              ) {
                const tokenData = await getTokenMetadata(
                  token,
                  this.chainId,
                  this.provider,
                )
                tokensData.push({
                  ...tokenData,
                  balanceRaw: event.args.deltas[index] || BigInt('0'),
                  type: TokenType.Underlying,
                })
              }
            }),
          )
          const result: MovementsByBlock = {
            transactionHash: event.transactionHash,
            protocolToken,
            tokens: tokensData,
            blockNumber: event.blockNumber,
          }
          response.push(result)
        }
      }),
    )
    return response
  }
  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: '0x286381aEdd20e51f642fE4A200B5CB2Fe3729695',
    }
    const protocolToken = await this.fetchProtocolTokenMetadata(
      _input.protocolTokenAddress,
    )
    const vaultContract = Vault__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )
    const poolContract = Pool__factory.connect(
      _input.protocolTokenAddress,
      this.provider,
    )
    const poolId = await poolContract.getPoolId()
    const filter = vaultContract.filters[
      'PoolBalanceChanged(bytes32,address,address[],int256[],uint256[])'
    ](poolId, _input.userAddress)
    const events =
      await vaultContract.queryFilter<PoolBalanceChangedEvent.Event>(
        filter,
        _input.fromBlock,
        _input.toBlock,
      )
    const response: MovementsByBlock[] = []
    await Promise.all(
      events.map(async (event) => {
        const amounts = event.args.deltas
        const total = amounts.reduce(
          (sum, amount) => (sum = sum + parseFloat(amount.toString())),
          0,
        )
        if (total < 0) {
          const tokensData: Underlying[] = []
          await Promise.all(
            event.args.tokens.map(async (token, index) => {
              if (
                token.toLowerCase() !==
                _input.protocolTokenAddress.toLocaleLowerCase()
              ) {
                const tokenData = await getTokenMetadata(
                  token,
                  this.chainId,
                  this.provider,
                )
                tokensData.push({
                  ...tokenData,
                  balanceRaw: event?.args?.deltas?.[index]
                    ? BigInt(
                        Math.abs(
                          parseFloat(
                            event.args.deltas[index]?.toString() ?? '0',
                          ),
                        ),
                      )
                    : BigInt('0'),
                  type: TokenType.Underlying,
                })
              }
            }),
          )
          const result: MovementsByBlock = {
            transactionHash: event.transactionHash,
            protocolToken,
            tokens: tokensData,
            blockNumber: event.blockNumber,
          }
          response.push(result)
        }
      }),
    )
    return response
  }
  async getPositions({
    userAddress,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()
    const positions: ProtocolPosition[] = []
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: '0x286381aEdd20e51f642fE4A200B5CB2Fe3729695',
    }
    const poolDataQueryAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: '0xb2F2537E332F9A1aADa289df9fC770D5120613C9',
    }
    const vaultContract = Vault__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )
    const balancerPoolDataQueriesContract =
      BalancerPoolDataQueries__factory.connect(
        poolDataQueryAddresses[this.chainId]!,
        this.provider,
      )
    await Promise.all(
      protocolTokens.map(async (protocolToken) => {
        const poolContract = Pool__factory.connect(
          protocolToken.address,
          this.provider,
        )
        const userBalance = await poolContract.balanceOf(userAddress)
        if (parseFloat(userBalance.toString()) > 0) {
          const poolId = await poolContract.getPoolId()
          const pool = await vaultContract.getPool(poolId)
          const poolTokens = await vaultContract.getPoolTokens(poolId)
          let totalSupplyType = '0'
          if (pool[1].toString() === '0') {
            totalSupplyType = '2'
          }
          const totalSupplyResp =
            await balancerPoolDataQueriesContract.getTotalSupplyForPools(
              [protocolToken.address],
              [totalSupplyType],
            )
          const userShare =
            parseFloat(userBalance.toString()) /
            parseFloat(totalSupplyResp[0]?.toString() ?? '1')
          const tokens: Underlying[] = []
          await Promise.all(
            poolTokens[0].map(async (token, index) => {
              if (token.toLowerCase() !== protocolToken.address.toLowerCase()) {
                const tokenData = await getTokenMetadata(
                  token,
                  this.chainId,
                  this.provider,
                )
                tokens.push({
                  ...tokenData,
                  balanceRaw: BigInt(
                    Math.trunc(
                      parseFloat(poolTokens[1][index]?.toString() ?? '0') *
                        parseFloat(userShare.toString()),
                    ),
                  ),

                  type: TokenType.Underlying,
                })
              }
            }),
          )
          positions.push({
            ...protocolToken,
            type: TokenType.Protocol,
            tokens,
            balanceRaw: BigInt(userBalance.toString()),
          })
        }
      }),
    )
    return positions
  }
  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  /**
   * Update me.
   * Add logic to turn the LP token balance into the correct underlying token(s) balance
   * For context see dashboard example ./dashboard.png
   */
  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to find tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()
    const totalValueLocked: ProtocolTokenTvl[] = []
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: '0x286381aEdd20e51f642fE4A200B5CB2Fe3729695',
    }
    const poolDataQueryAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: '0xb2F2537E332F9A1aADa289df9fC770D5120613C9',
    }
    const vaultContract = Vault__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )
    const balancerPoolDataQueriesContract =
      BalancerPoolDataQueries__factory.connect(
        poolDataQueryAddresses[this.chainId]!,
        this.provider,
      )
    await Promise.all(
      protocolTokens.map(async (protocolToken) => {
        const poolContract = Pool__factory.connect(
          protocolToken.address,
          this.provider,
        )
        const poolId = await poolContract.getPoolId()
        const pool = await vaultContract.getPool(poolId)
        const poolTokens = await vaultContract.getPoolTokens(poolId)
        let totalSupplyType = '0'
        if (pool[1].toString() === '0') {
          totalSupplyType = '2'
        }
        const totalSupplyResp =
          await balancerPoolDataQueriesContract.getTotalSupplyForPools(
            [protocolToken.address],
            [totalSupplyType],
          )
        const tokens: UnderlyingTokenTvl[] = []
        await Promise.all(
          poolTokens[0].map(async (token, index) => {
            if (token.toLowerCase() !== protocolToken.address.toLowerCase()) {
              const tokenData = await getTokenMetadata(
                token,
                this.chainId,
                this.provider,
              )
              tokens.push({
                ...tokenData,
                totalSupplyRaw: BigInt(poolTokens[1][index] ?? '0'),
                type: TokenType.Underlying,
              })
            }
          }),
        )
        totalValueLocked.push({
          ...protocolToken,
          type: TokenType.Protocol,
          tokens,
          totalSupplyRaw: BigInt(totalSupplyResp.toString()),
        })
      }),
    )
    console.log('Implemented', totalValueLocked)
    return totalValueLocked
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  /**
   * Update me.
   * Add logic that finds the underlying token rates for 1 protocol token
   */
  protected async getUnderlyingTokenConversionRate(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return underlyingTokens
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
