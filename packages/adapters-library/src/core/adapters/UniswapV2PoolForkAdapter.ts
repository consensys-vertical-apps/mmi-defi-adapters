import { getAddress } from 'ethers'
import PQueue from 'p-queue'
import { Protocol } from '../../adapters/protocols'
import {
  UniswapV2Factory__factory,
  UniswapV2Pair__factory,
} from '../../contracts'
import { Helpers } from '../../scripts/helpers'
import { IProtocolAdapter, ProtocolToken } from '../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
  UnwrappedTokenExchangeRate,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import { CacheToDb } from '../decorators/cacheToDb'
import { NotImplementedError } from '../errors/errors'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../utils/filters'
import { getTokenMetadata } from '../utils/getTokenMetadata'
import { logger } from '../utils/logger'

export type UniswapV2PoolForkPositionStrategy = { factoryAddress: string } & (
  | {
      type: 'graphql'
      subgraphUrl: string
      subgraphQuery?: (BATCH_SIZE: number, skip: number) => string
    }
  | { type: 'factory' }
  | { type: 'logs' }
)

export abstract class UniswapV2PoolForkAdapter implements IProtocolAdapter {
  protected readonly MAX_CONCURRENT_FACTORY_PROMISES: number = 10000
  protected readonly MAX_FACTORY_POOL_COUNT: number = 10000
  protected readonly MAX_CONCURRENT_GRAPHQL_REQUESTS: number = 10

  public adapterSettings: AdapterSettings

  protected abstract PROTOCOL_TOKEN_PREFIX_OVERRIDE: {
    name: string
    symbol: string
  }

  protected metadataBased: boolean

  abstract productId: string

  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  protected provider: CustomJsonRpcProvider

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

    this.metadataBased =
      this.chainMetadataSettings()[this.chainId]!.type !== 'logs'

    this.adapterSettings = {
      enablePositionDetectionByProtocolTokenTransfer: this.metadataBased,
      includeInUnwrap: this.metadataBased,
    }
  }

  abstract getProtocolDetails(): ProtocolDetails

  protected abstract chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkPositionStrategy>
  >

  @CacheToDb()
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const factoryMetadata = this.chainMetadataSettings()[this.chainId]

    if (!factoryMetadata) {
      throw new Error('Chain not supported')
    }

    if (factoryMetadata.type === 'logs') {
      throw new NotImplementedError()
    }

    if (factoryMetadata.type === 'factory') {
      return this.factoryPoolExtraction(factoryMetadata.factoryAddress)
    }

    const pairs: {
      pairAddress: string
      token0Address: string
      token1Address: string
    }[] = await this.graphQlPoolExtractionWithLimit(factoryMetadata)

    return this.processPairsWithQueue(pairs)
  }

  async processPairsWithQueue(
    pairs: {
      pairAddress: string
      token0Address: string
      token1Address: string
    }[],
  ) {
    // Initialize p-queue with controlled concurrency
    const queue = new PQueue({
      concurrency: this.MAX_CONCURRENT_FACTORY_PROMISES,
    })

    const results: ProtocolToken[] = []

    // Process each pair with concurrency control
    for (const pair of pairs) {
      queue.add(async () => {
        try {
          // Fetch token metadata concurrently
          const [token0, token1] = await Promise.all([
            this.helpers.getTokenMetadata(pair.token0Address),
            this.helpers.getTokenMetadata(pair.token1Address),
          ])

          // Update protocol token with token0 and token1 metadata
          const protocolTokenUpdated = await this.setTokenNameAndSymbol(
            pair.pairAddress,
            { token0, token1 },
          )

          // Construct the result and push to results array
          const result = {
            ...protocolTokenUpdated,
            underlyingTokens: [token0, token1],
          }

          results.push(result)

          logger.info(
            `[${new Date().toISOString()}] Processed metadata ${
              results.length
            } of ${pairs.length}`,
          )
        } catch (error) {
          logger.error(
            `Error processing pair: ${pair.pairAddress}`,
            (error as Error).message,
          )
        }
      })
    }

    // Wait for the queue to finish processing all pairs
    await queue.onIdle()

    return results
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    if (
      input.protocolTokenAddresses &&
      input.protocolTokenAddresses.length === 0
    ) {
      throw new Error(
        'No protocol token address filter provided, must be provided for this adapter due to the large number of pools',
      )
    }

    if (this.metadataBased) {
      return this.helpers.getBalanceOfTokens({
        ...input,
        protocolTokens: await this.getProtocolTokens(),
      })
    }

    const transferLogs = await this.provider.getAllTransferLogsToAddress(
      input.userAddress,
    )

    // Get all unique UniswapV2 pair addresses from the transfer logs
    const uniswapV2Addresses = await filterMapAsync(
      Array.from(new Set(transferLogs.map((log) => log.address))),
      async (address) => {
        const pairContract = UniswapV2Pair__factory.connect(
          address,
          this.provider,
        )
        try {
          const factory = await pairContract.factory()

          if (
            factory !==
            this.chainMetadataSettings()[this.chainId]!.factoryAddress
          ) {
            return undefined
          }

          return await getTokenMetadata(address, this.chainId, this.provider)
        } catch (error) {
          return undefined
        }
      },
    )

    const protocolTokenBalances = await this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: uniswapV2Addresses,
    })

    return await Promise.all(
      protocolTokenBalances.map(async (protocolTokenBalance) => {
        const underlyingRates = await this.unwrap({
          protocolTokenAddress: protocolTokenBalance.address,
          blockNumber: input.blockNumber,
        })

        const protocolTokenBalanceUpdated = await this.setTokenNameAndSymbol(
          protocolTokenBalance.address,
          {
            // Uniswap V2 pairs always have two tokens
            token0: underlyingRates.tokens![0]!,
            token1: underlyingRates.tokens![1]!,
          },
        )

        return {
          ...protocolTokenBalanceUpdated,
          type: protocolTokenBalance.type,
          balanceRaw: protocolTokenBalance.balanceRaw,
          tokens: underlyingRates.tokens!.map((token) => {
            return {
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              type: TokenType.Underlying,
              balanceRaw:
                (token.underlyingRateRaw! * protocolTokenBalance.balanceRaw) /
                10n ** BigInt(protocolTokenBalance.decimals),
            }
          }),
        }
      }),
    )
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (this.metadataBased) {
      return this.helpers.withdrawals({
        protocolToken: await this.getProtocolToken(protocolTokenAddress),
        filter: { fromBlock, toBlock, userAddress },
      })
    }

    const protocolToken = await this.setTokenNameAndSymbol(protocolTokenAddress)

    const withdrawals = await this.helpers.withdrawals({
      protocolToken,
      filter: { fromBlock, toBlock, userAddress },
    })

    return await Promise.all(
      withdrawals.map(async (withdrawal) => {
        const underlyingRates = await this.unwrap({
          protocolTokenAddress: withdrawal.protocolToken.address,
          blockNumber: withdrawal.blockNumber,
        })

        const protocolTokenBalance = withdrawal.tokens[0]!
        const token0 = underlyingRates.tokens![0]!
        const token1 = underlyingRates.tokens![1]!

        return {
          ...withdrawal,
          protocolToken,
          tokens: [
            {
              ...protocolTokenBalance,
              name: protocolToken.name,
              symbol: protocolToken.symbol,
              tokens: [
                this.underlyingTokenBalance(token0, protocolTokenBalance),
                this.underlyingTokenBalance(token1, protocolTokenBalance),
              ],
            },
          ],
        }
      }),
    )
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (this.metadataBased) {
      return this.helpers.deposits({
        protocolToken: await this.getProtocolToken(protocolTokenAddress),
        filter: { fromBlock, toBlock, userAddress },
      })
    }

    const protocolToken = await this.setTokenNameAndSymbol(protocolTokenAddress)

    const deposits = await this.helpers.deposits({
      protocolToken,
      filter: { fromBlock, toBlock, userAddress },
    })

    return await Promise.all(
      deposits.map(async (deposit) => {
        const underlyingRates = await this.unwrap({
          protocolTokenAddress: deposit.protocolToken.address,
          blockNumber: deposit.blockNumber,
        })

        const protocolTokenBalance = deposit.tokens[0]!
        const token0 = underlyingRates.tokens![0]!
        const token1 = underlyingRates.tokens![1]!

        return {
          ...deposit,
          protocolToken,
          tokens: [
            {
              ...protocolTokenBalance,
              name: protocolToken.name,
              symbol: protocolToken.symbol,
              tokens: [
                this.underlyingTokenBalance(token0, protocolTokenBalance),
                this.underlyingTokenBalance(token1, protocolTokenBalance),
              ],
            },
          ],
        }
      }),
    )
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const {
      underlyingTokens: [token0, token1],
      ...protocolToken
    } = await this.fetchPoolMetadata(protocolTokenAddress)

    const pairContract = UniswapV2Pair__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const [protocolTokenSupply, [reserve0, reserve1]] = await Promise.all([
      pairContract.totalSupply({ blockTag: blockNumber }),
      pairContract.getReserves({ blockTag: blockNumber }),
    ])

    const [pricePerShare0, pricePerShare1] = [reserve0, reserve1].map(
      (reserve) =>
        // AssetReserve / ProtocolTokenSupply / 10 ** ProtocolTokenDecimals
        // Moved last division as multiplication at the top
        // Division sometimes is not exact, so it needs rounding
        BigInt(
          Math.round(
            (Number(reserve) * 10 ** protocolToken.decimals) /
              Number(protocolTokenSupply),
          ),
        ),
    )

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          type: TokenType.Underlying,
          underlyingRateRaw: pricePerShare0!,
          ...token0!,
        },
        {
          type: TokenType.Underlying,
          underlyingRateRaw: pricePerShare1!,
          ...token1!,
        },
      ],
    }
  }

  private async getProtocolToken(protocolTokenAddress: string) {
    const { underlyingTokens, ...protocolToken } =
      await this.fetchPoolMetadata(protocolTokenAddress)
    return protocolToken
  }

  protected async fetchPoolMetadata(protocolTokenAddress: string) {
    if (this.metadataBased) {
      const poolMetadata = (await this.getProtocolTokens()).find(
        (pool) => pool.address === protocolTokenAddress,
      )

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

    const pairContract = UniswapV2Pair__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const protocolToken = await getTokenMetadata(
      protocolTokenAddress,
      this.chainId,
      this.provider,
    )

    const token0 = await getTokenMetadata(
      await pairContract.token0(),
      this.chainId,
      this.provider,
    )

    const token1 = await getTokenMetadata(
      await pairContract.token1(),
      this.chainId,
      this.provider,
    )

    return {
      ...protocolToken,
      underlyingTokens: [token0, token1],
      token0: token0.address,
      token1: token1.address,
    }
  }

  private async graphQlPoolExtractionWithLimit({
    subgraphUrl,
    subgraphQuery,
  }: {
    subgraphUrl: string
    subgraphQuery?: (BATCH_SIZE: number, skip: number) => string
  }): Promise<
    {
      pairAddress: string
      token0Address: string
      token1Address: string
    }[]
  > {
    // Proceed with fetching pools if the total is under the limit (continue with your pagination logic)
    const results: {
      pairAddress: string
      token0Address: string
      token1Address: string
    }[] = []

    const BATCH_SIZE = 1000 // Number of pairs to request in each batch
    let hasMore = true
    let skip = 0

    const queue = new PQueue({
      concurrency: this.MAX_CONCURRENT_GRAPHQL_REQUESTS,
    })

    console.log(
      `[${new Date().toISOString()}] Starting GraphQL pool extraction.`,
    )

    // Function to fetch pools in batches
    const fetchPools = async (skip: number) => {
      const response = await fetch(subgraphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            subgraphQuery?.(BATCH_SIZE, skip) ??
            `
            {
              pairs(
                first: ${BATCH_SIZE}
                skip: ${skip}
                where: {
                  reserveUSD_gt: 50000
                }
                orderBy: reserveUSD
                orderDirection: desc
              ) {
                id
                token0 {
                  id
                }
                token1 {
                  id
                }
              }
            }
          `,
        }),
      })

      const gqlResponse = await response.json()

      if (gqlResponse.message) {
        console.error(
          `Error fetching pairs at skip ${skip}:`,
          gqlResponse.message,
        )
        throw new Error(gqlResponse.message)
      }

      if (gqlResponse.errors) {
        console.error(
          `Error fetching pairs at skip ${skip}:`,
          gqlResponse.errors,
        )
        return []
      }

      return gqlResponse.data.pairs.map(
        (pair: {
          id: string
          token0: { id: string }
          token1: { id: string }
        }) => ({
          pairAddress: getAddress(pair.id),
          token0Address: getAddress(pair.token0.id),
          token1Address: getAddress(pair.token1.id),
        }),
      )
    }

    // Use p-queue to fetch batches of pools concurrently
    while (hasMore) {
      await queue.add(async () => {
        const poolBatch = await fetchPools(skip)

        if (poolBatch.length > 0) {
          results.push(...poolBatch)
          console.log(
            `[${new Date().toISOString()}] Processed batch starting at ${skip}. Total pools so far: ${
              results.length
            }`,
          )
        }

        if (poolBatch.length < BATCH_SIZE) {
          hasMore = false // No more results to process
        }

        skip += BATCH_SIZE // Move to the next batch
      })
    }

    // Wait for all tasks in the queue to complete
    await queue.onIdle()

    console.log(
      `[${new Date().toISOString()}] Completed GraphQL pool extraction. Total pools indexed: ${
        results.length
      }`,
    )

    return results
  }

  private async factoryPoolExtraction(
    factoryAddress: string,
  ): Promise<ProtocolToken[]> {
    const factoryContract = UniswapV2Factory__factory.connect(
      factoryAddress,
      this.provider,
    )
    const allPairsLength = 1 ?? Number(await factoryContract.allPairsLength())

    if (allPairsLength > this.MAX_FACTORY_POOL_COUNT) {
      throw new Error(
        `Factory job size exceeds the limit ${allPairsLength} > ${this.MAX_FACTORY_POOL_COUNT}`,
      )
    }

    // Define jobSize to limit how many pairs to process in one go
    const jobSize = Math.min(this.MAX_FACTORY_POOL_COUNT, allPairsLength)
    const concurrency = Number(this.MAX_CONCURRENT_FACTORY_PROMISES)

    // Initialize p-queue for concurrency control
    const queue = new PQueue({ concurrency })

    console.log(
      `Starting factoryPoolExtraction with jobSize: ${jobSize}, concurrency: ${concurrency}`,
    )

    const results: ProtocolToken[] = []

    // Process pairs from startIndex to jobSize
    for (let index = 0; index < jobSize && index < allPairsLength; index++) {
      queue.add(async () => {
        try {
          const pairAddress = getAddress(await factoryContract.allPairs(index))
          const pairContract = UniswapV2Pair__factory.connect(
            pairAddress,
            this.provider,
          )

          const [token0Address, token1Address] = await Promise.all([
            pairContract.token0(),
            pairContract.token1(),
          ])

          const [token0, token1] = await Promise.all([
            this.helpers.getTokenMetadata(token0Address),
            this.helpers.getTokenMetadata(token1Address),
          ])

          // Update protocol token with token0 and token1 metadata
          const protocolTokenUpdated = await this.setTokenNameAndSymbol(
            pairAddress,
            { token0, token1 },
          )

          // Construct the result and push to results array
          const result = {
            ...protocolTokenUpdated,
            address: getAddress(protocolTokenUpdated.address),

            underlyingTokens: [
              { ...token0, address: getAddress(token0.address) },
              { ...token1, address: getAddress(token1.address) },
            ],
            token0: getAddress(token0.address),
            token1: getAddress(token1.address),
          }

          results.push(result)

          console.log(
            `[${new Date().toISOString()}] Processed metadata ${
              results.length
            } of ${jobSize}`,
          )

          console.log(`Processed pair at index ${index}`)
        } catch (error) {
          console.error(
            `Error processing pair at index ${index}:`,
            (error as Error).message,
          )
        }
      })
    }

    // Wait for the queue to finish all tasks
    await queue.onIdle()

    console.log(
      `Completed factoryPoolExtraction. Processed ${results.length} pairs.`,
    )

    return results
  }

  private async setTokenNameAndSymbol(
    pairAddress: string,
    underlyings?: { token0: Erc20Metadata; token1: Erc20Metadata },
  ): Promise<Erc20Metadata> {
    let token0: Erc20Metadata
    let token1: Erc20Metadata

    if (!underlyings) {
      const pairContract = UniswapV2Pair__factory.connect(
        pairAddress,
        this.provider,
      )

      const [token0Address, token1Address] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
      ])
      ;[token0, token1] = await Promise.all([
        this.helpers.getTokenMetadata(token0Address),
        this.helpers.getTokenMetadata(token1Address),
      ])
    } else {
      token0 = underlyings.token0
      token1 = underlyings.token1
    }

    const [name, symbol] = [
      this.PROTOCOL_TOKEN_PREFIX_OVERRIDE.name,
      this.PROTOCOL_TOKEN_PREFIX_OVERRIDE.symbol,
    ]

    return {
      address: getAddress(pairAddress),
      name: `${name} ${token0.symbol} / ${token1.symbol}`,
      symbol: `${symbol}/${token0.symbol}/${token1.symbol}`,
      decimals: 18,
    }
  }

  private underlyingTokenBalance(
    token: UnwrappedTokenExchangeRate,
    protocolTokenBalance: Erc20Metadata & { balanceRaw: bigint },
  ) {
    return {
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      type: TokenType.Underlying,
      balanceRaw:
        (token.underlyingRateRaw! * protocolTokenBalance.balanceRaw) /
        10n ** BigInt(protocolTokenBalance.decimals),
    }
  }
}
