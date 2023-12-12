import { formatUnits } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import {
  ResolveUnderlyingMovements,
  ResolveUnderlyingPositions,
} from '../../../../core/decorators/resolveUnderlyingPositions'
import { NotImplementedError } from '../../../../core/errors/errors'
import { aggregateTrades } from '../../../../core/utils/aggregateTrades'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import { formatProtocolTokenArrayToMap } from '../../../../core/utils/protocolTokenToMap'
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
  GetPositionsInput,
  ProtocolPosition,
  TokenType,
  GetEventsInput,
  MovementsByBlock,
  ProtocolAdapterParams,
  GetProfitsInput,
  ProfitsWithRange,
  CalculationData,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  BasePool__factory,
  Multicall,
  Multicall__factory,
  MutlicallOld__factory,
} from '../../contracts'

type SyncSwapAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

interface SyncSwapAdapterContracts {
  multicall: string
  multicallOld: string
  poolMaster: string
  poolMaster2?: string
  router: string
  factoriesV1: string[]
  factoriesV2: string[]
  quoteRouteTokens: string[]
}

const FETCH_POOLS_ENTERED_BATCH_COUNT = 10

const contractAddresses: Partial<Record<Chain, SyncSwapAdapterContracts>> = {
  [Chain.Linea]: {
    multicall: '0xCEeF5844Ce39B0BdD4a8A645B811Fb8caCf5F330',
    multicallOld: '0xBe87D2faF9863130D60fe0c454B5990863d45BBa',
    poolMaster: '0x608Cb7C3168427091F5994A45Baf12083964B4A3',
    router: '0x80e38291e06339d10AAB483C65695D004dBD5C69',
    factoriesV1: [
      '0x37BAc764494c8db4e54BDE72f6965beA9fa0AC2d', // classic pool
      '0xE4CF807E351b56720B17A59094179e7Ed9dD3727', // stable pool
    ],
    factoriesV2: [],
    quoteRouteTokens: [
      '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', // weth
    ],
  },
}

export class SyncswapPoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'pool'

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    super({
      provider,
      chainId,
      protocolId,
      adaptersController,
    })
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'SyncSwap',
      description: 'SyncSwap defi adapter',
      siteUrl: 'https://syncswap.xyz',
      iconUrl: 'https://syncswap.xyz/images/syncswap.svg',
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
    return {} as SyncSwapAdapterMetadata
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  @ResolveUnderlyingPositions
  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const multiCallGetEnteredPoolsFn = callGetEnteredPoolsByBlockNumber
    const { chainId, provider } = this
    const enteredPools = await (async function fetchPools(
      results: Awaited<
        ReturnType<Awaited<ReturnType<typeof multiCallGetEnteredPoolsFn>>>
      >['pools'] = [],
      index = 0,
    ): Promise<
      Awaited<
        ReturnType<Awaited<ReturnType<typeof multiCallGetEnteredPoolsFn>>>
      >['pools']
    > {
      const batchRes = await multiCallGetEnteredPoolsFn(
        chainId,
        provider,
        userAddress,
        index,
        blockNumber,
      )()
      const pools =
        batchRes.pools ||
        (batchRes['0'] as unknown as Multicall.GetPoolsStructOutput)['pools']

      if (pools.every((pool) => pool.pool !== ZERO_ADDRESS)) {
        return results.concat(
          await fetchPools(pools, index + FETCH_POOLS_ENTERED_BATCH_COUNT),
        )
      } else {
        return results.concat(pools)
      }
    })()

    return filterMapAsync(enteredPools, async (positionPool) => {
      if (
        positionPool.accountBalance === 0n ||
        positionPool.pool === ZERO_ADDRESS
      ) {
        return undefined
      }
      const [token0Metadata, token1Metadata, protocolTokenMetadata] =
        await Promise.all([
          getTokenMetadata(
            positionPool.token0.token,
            this.chainId,
            this.provider,
          ),
          getTokenMetadata(
            positionPool.token1.token,
            this.chainId,
            this.provider,
          ),
          getTokenMetadata(positionPool.pool, this.chainId, this.provider),
        ])

      return {
        address: positionPool.pool,
        name: protocolTokenMetadata.name,
        symbol: protocolTokenMetadata.symbol,
        decimals: 18,
        balanceRaw: positionPool.accountBalance,
        type: TokenType.Protocol,
        tokens: [
          this.createUnderlyingToken(
            positionPool.token0.token,
            token0Metadata,
            (positionPool.reserve0 * positionPool.accountBalance) /
              positionPool.totalSupply,
            TokenType.Underlying,
          ),
          this.createUnderlyingToken(
            positionPool.token1.token,
            token1Metadata,
            (positionPool.reserve1 * positionPool.accountBalance) /
              positionPool.totalSupply,
            TokenType.Underlying,
          ),
        ],
      }
    })
  }

  private createUnderlyingToken(
    address: string,
    metadata: Erc20Metadata,
    balanceRaw: bigint,
    type: typeof TokenType.Underlying | typeof TokenType.UnderlyingClaimable,
  ): Underlying {
    return {
      address,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      balanceRaw,
      type,
    }
  }

  @ResolveUnderlyingMovements
  async getWithdrawals({
    protocolTokenAddress,
    userAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getSyncSwapMovements({
      protocolTokenAddress,
      userAddress,
      fromBlock,
      toBlock,
      eventType: 'withdrawals',
    })
  }

  @ResolveUnderlyingMovements
  async getDeposits({
    protocolTokenAddress,
    userAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getSyncSwapMovements({
      protocolTokenAddress,
      userAddress,
      fromBlock,
      toBlock,
      eventType: 'deposit',
    })
  }

  async getProfits({
    userAddress,
    fromBlock,
    toBlock,
  }: GetProfitsInput): Promise<ProfitsWithRange> {
    const [currentValues, previousValues] = await Promise.all([
      this.getPositions({
        userAddress,
        blockNumber: toBlock,
      }).then((result) => formatProtocolTokenArrayToMap(result, true)),
      this.getPositions({
        userAddress,
        blockNumber: fromBlock,
      }).then((result) => formatProtocolTokenArrayToMap(result, true)),
    ])

    const tokens = await Promise.all(
      Object.values(currentValues).map(
        async ({ protocolTokenMetadata, underlyingTokenPositions }) => {
          const getEventsInput: GetEventsInput = {
            userAddress,
            protocolTokenAddress: protocolTokenMetadata.address,
            fromBlock,
            toBlock,
            tokenId: protocolTokenMetadata.tokenId,
          }

          const [withdrawals, deposits] = await Promise.all([
            this.getWithdrawals(getEventsInput).then(aggregateTrades),
            this.getDeposits(getEventsInput).then(aggregateTrades),
          ])

          return {
            ...protocolTokenMetadata,
            type: TokenType.Protocol,
            profit: 0,
            performance: 0,
            tokens: Object.values(underlyingTokenPositions).map(
              ({
                address,
                name,
                symbol,
                decimals,
                balanceRaw: startPositionValueRaw,
              }) => {
                const endPositionValueRaw =
                  previousValues[protocolTokenMetadata.tokenId!]
                    ?.underlyingTokenPositions[address]?.balanceRaw ?? 0n

                const calculationData = {
                  withdrawalsRaw: withdrawals[address] ?? 0n,
                  depositsRaw: deposits[address] ?? 0n,
                  startPositionValueRaw: startPositionValueRaw ?? 0n,
                  endPositionValueRaw,
                }

                const profitRaw =
                  calculationData.startPositionValueRaw +
                  calculationData.withdrawalsRaw -
                  calculationData.depositsRaw -
                  calculationData.endPositionValueRaw

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
                  } as unknown as CalculationData,
                }
              },
            ),
          }
        },
      ),
    )

    return { tokens, fromBlock, toBlock } as unknown as ProfitsWithRange
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
    throw new NotImplementedError()
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
    const { underlyingTokens } =
      await this.fetchPoolMetadata(protocolTokenAddress)

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

  private async getSyncSwapMovements({
    protocolTokenAddress,
    userAddress,
    eventType,
    fromBlock,
    toBlock,
  }: {
    protocolTokenAddress: string
    userAddress: string
    eventType: 'withdrawals' | 'deposit'
    fromBlock: number
    toBlock: number
  }): Promise<MovementsByBlock[]> {
    const poolContract = BasePool__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const eventFilters = {
      deposit: poolContract.filters.Mint(
        undefined,
        undefined,
        undefined,
        undefined,
        userAddress,
      ),
      withdrawals: poolContract.filters.Burn(
        undefined,
        undefined,
        undefined,
        undefined,
        userAddress,
      ),
    }

    const [token0, token1] = await poolContract.getAssets()
    if (!token0 || !token1) {
      throw new Error(`Invalid Token`)
    }
    const [token0Metadata, token1Metadata, protocolTokenMetadata] =
      await Promise.all([
        getTokenMetadata(token0, this.chainId, this.provider),
        getTokenMetadata(token1, this.chainId, this.provider),
        getTokenMetadata(protocolTokenAddress, this.chainId, this.provider),
      ])

    const eventResults = await poolContract.queryFilter(
      eventFilters[eventType],
      fromBlock,
      toBlock,
    )

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { amount0, amount1 },
          transactionHash,
        } = transferEvent

        return {
          transactionHash,
          protocolToken: {
            address: protocolTokenAddress,
            name: protocolTokenMetadata.name,
            symbol: protocolTokenMetadata.symbol,
            decimals: 18,
          },
          tokens: [
            {
              type: TokenType.Underlying,
              balanceRaw: amount0,
              ...token0Metadata,
              transactionHash,
              blockNumber,
            },
            {
              type: TokenType.Underlying,
              balanceRaw: amount1,
              ...token1Metadata,
              transactionHash,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )
  }
}
function callGetEnteredPoolsByBlockNumber(
  chainId: Chain,
  provider: CustomJsonRpcProvider,
  userAddress: string,
  index: number,
  blockNumber?: number,
) {
  const addrs = contractAddresses[chainId]!
  switch (chainId) {
    case Chain.Linea: {
      if (blockNumber && blockNumber >= 438549) {
        return () => {
          return Multicall__factory.connect(
            contractAddresses[chainId]!.multicall,
            provider,
          ).getEnteredPools(
            addrs.poolMaster,
            addrs.poolMaster2 || addrs.poolMaster,
            addrs.router,
            userAddress,
            index,
            FETCH_POOLS_ENTERED_BATCH_COUNT,
            addrs.factoriesV1,
            addrs.factoriesV2,
            '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', // usdc
            addrs.quoteRouteTokens,
            {
              blockTag: blockNumber,
            },
          )
        }
      }
      return () => {
        return MutlicallOld__factory.connect(
          contractAddresses[chainId]!.multicallOld,
          provider,
        ).getEnteredPools(
          addrs.poolMaster,
          addrs.router,
          '0x7f72e0d8e9abf9133a92322b8b50bd8e0f9dcfcb', // busd
          index,
          FETCH_POOLS_ENTERED_BATCH_COUNT,
          {
            blockTag: blockNumber,
          },
        )
      }
    }
  }
  throw new Error('Get Multicall contract failed')
}
