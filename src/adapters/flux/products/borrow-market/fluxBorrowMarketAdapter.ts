import { LogDescription } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import {
  ResolveUnderlyingPositions,
  ResolveUnderlyingMovements,
} from '../../../../core/decorators/resolveUnderlyingPositions'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync, filterMapSync } from '../../../../core/utils/filters'
import { logger } from '../../../../core/utils/logger'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  GetApyInput,
  GetAprInput,
  GetConversionRateInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProtocolTokenTvl,
  ProtocolPosition,
  AssetType,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { buildMetadata } from '../../../compound-v2/common/buildMetadata'
import {
  Comptroller__factory,
  Cerc20__factory,
} from '../../../compound-v2/contracts'
import {
  BorrowEvent,
  RepayBorrowEvent,
} from '../../../compound-v2/contracts/Cerc20'
import { Protocol } from '../../../protocols'
import { contractAddresses } from '../../common/contractAddresses'

export class FluxBorrowMarketAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  chainId: Chain
  protocolId: Protocol
  productId: string = 'borrow-market'

  protected provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Flux',
      description: 'Flux borrow market adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return await buildMetadata({
      chainId: this.chainId,
      provider: this.provider,
      contractAddresses,
    })
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
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

  @ResolveUnderlyingPositions
  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const comptrollerContract = Comptroller__factory.connect(
      contractAddresses[this.chainId]!.comptrollerAddress,
      this.provider,
    )

    const pools = await comptrollerContract.getAssetsIn(userAddress)

    return await filterMapAsync(pools, async (poolContractAddress) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(poolContractAddress)
      ) {
        return undefined
      }

      const { protocolToken, underlyingToken } = await this.fetchPoolMetadata(
        poolContractAddress,
      )

      const poolContract = Cerc20__factory.connect(
        poolContractAddress,
        this.provider,
      )

      const borrowBalance = await poolContract.borrowBalanceCurrent.staticCall(
        userAddress,
        {
          blockTag: blockNumber,
        },
      )

      if (borrowBalance === 0n) {
        return undefined
      }

      return {
        ...protocolToken,
        balanceRaw: 1n,
        type: TokenType.Protocol,
        tokens: [
          {
            ...underlyingToken,
            balanceRaw: borrowBalance,
            type: TokenType.Underlying,
          },
        ],
      }
    })
  }

  @ResolveUnderlyingMovements
  async getBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getRepaysOrBorrows({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      extractAmount: (log: LogDescription) =>
        log.name === 'Borrow'
          ? (log as unknown as BorrowEvent.LogDescription).args.borrowAmount
          : undefined,
    })
  }

  @ResolveUnderlyingMovements
  async getRepays({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getRepaysOrBorrows({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      extractAmount: (log: LogDescription) =>
        log.name === 'RepayBorrow'
          ? (log as unknown as RepayBorrowEvent.LogDescription).args.repayAmount
          : undefined,
    })
  }

  private async getRepaysOrBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
    extractAmount,
  }: GetEventsInput & {
    extractAmount: (logs: LogDescription) => bigint | undefined
  }): Promise<MovementsByBlock[]> {
    const { protocolToken, underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    const cTokenContract = Cerc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const comptrollerContract = Comptroller__factory.connect(
      contractAddresses[this.chainId]!.comptrollerAddress,
      this.provider,
    )

    const comptrollerBorrowEventFilter =
      comptrollerContract.filters.DistributedBorrowerComp(
        protocolTokenAddress,
        userAddress,
        undefined,
        undefined,
      )

    const comptrollerBorrowEvents = await comptrollerContract.queryFilter(
      comptrollerBorrowEventFilter,
      fromBlock,
      toBlock,
    )

    // The same tx could have multiple events
    // With this we only fetch each tx receipt once
    const txReceipts = await Promise.all(
      [
        ...new Set(
          comptrollerBorrowEvents.map((event) => event.transactionHash),
        ),
      ].map(
        async (txHash) => (await this.provider.getTransactionReceipt(txHash))!,
      ),
    )

    // Filter out logs that are not part of the cToken
    // Filter out logs that do not meet extractAmount condition
    return txReceipts.flatMap((txReceipt) => {
      return filterMapSync(txReceipt.logs, (log) => {
        const parsedLog = cTokenContract.interface.parseLog({
          data: log.data,
          topics: log.topics as string[],
        })

        if (!parsedLog) {
          return undefined
        }

        const eventAmount = extractAmount(parsedLog)

        if (!eventAmount) {
          return undefined
        }

        return {
          transactionHash: txReceipt.hash,
          protocolToken: {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          },
          tokens: [
            {
              ...underlyingToken,
              balanceRaw: eventAmount,
              type: TokenType.Underlying,
              blockNumber: txReceipt.blockNumber,
            },
          ],
          blockNumber: txReceipt.blockNumber,
        }
      })
    })
  }

  getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }
}
