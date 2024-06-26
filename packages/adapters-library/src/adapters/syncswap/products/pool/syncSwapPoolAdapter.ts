import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  ProtocolPosition,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  BasePool__factory,
  Multicall,
  Multicall__factory,
  MutlicallOld__factory,
} from '../../contracts'

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
    multicall: getAddress('0xCEeF5844Ce39B0BdD4a8A645B811Fb8caCf5F330'),
    multicallOld: getAddress('0xBe87D2faF9863130D60fe0c454B5990863d45BBa'),
    poolMaster: getAddress('0x608Cb7C3168427091F5994A45Baf12083964B4A3'),
    router: getAddress('0x80e38291e06339d10AAB483C65695D004dBD5C69'),
    factoriesV1: [
      getAddress('0x37BAc764494c8db4e54BDE72f6965beA9fa0AC2d'), // classic pool
      getAddress('0xE4CF807E351b56720B17A59094179e7Ed9dD3727'), // stable pool
    ],
    factoriesV2: [],
    quoteRouteTokens: [
      getAddress('0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f'), // weth
    ],
  },
}

export class SyncSwapPoolAdapter extends SimplePoolAdapter {
  productId = 'pool'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const enteredPools = await this.fetchPools(userAddress, blockNumber)

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

  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }

  protected async fetchProtocolTokenMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    throw new NotImplementedError()
  }

  protected async unwrapProtocolToken(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    throw new NotImplementedError()
  }

  protected async fetchUnderlyingTokensMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
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
      throw new Error('Invalid Token')
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

  private async fetchPools(
    userAddress: string,
    blockNumber: number | undefined,
    results: Awaited<
      ReturnType<Awaited<ReturnType<typeof this.multiCallGetEnteredPoolsFn>>>
    >['pools'] = [],
    index = 0,
  ): Promise<
    Awaited<
      ReturnType<Awaited<ReturnType<typeof this.multiCallGetEnteredPoolsFn>>>
    >['pools']
  > {
    const batchRes = await this.multiCallGetEnteredPoolsFn(
      userAddress,
      index,
      blockNumber,
    )()
    const pools =
      batchRes.pools ||
      (batchRes['0'] as unknown as Multicall.GetPoolsStructOutput)['pools']

    if (pools.every((pool) => pool.pool !== ZERO_ADDRESS)) {
      return results.concat(
        await this.fetchPools(
          userAddress,
          blockNumber,
          pools,
          index + FETCH_POOLS_ENTERED_BATCH_COUNT,
        ),
      )
    }

    return results.concat(pools)
  }

  private multiCallGetEnteredPoolsFn(
    userAddress: string,
    index: number,
    blockNumber?: number,
  ) {
    const addrs = contractAddresses[this.chainId]!
    switch (this.chainId) {
      case Chain.Linea: {
        if (blockNumber && blockNumber >= 438549) {
          return () => {
            return Multicall__factory.connect(
              contractAddresses[this.chainId]!.multicall,
              this.provider,
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
            contractAddresses[this.chainId]!.multicallOld,
            this.provider,
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
}
