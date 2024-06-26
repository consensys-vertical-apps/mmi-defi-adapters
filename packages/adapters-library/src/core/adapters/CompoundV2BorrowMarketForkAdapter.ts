import { LogDescription } from 'ethers'
import { Protocol } from '../../adapters/protocols'
import {
  CompoundV2Cerc20__factory,
  CompoundV2Comptroller__factory,
} from '../../contracts'
import { BorrowEvent, RepayBorrowEvent } from '../../contracts/CompoundV2Cerc20'
import { Helpers } from '../../scripts/helpers'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
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
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import { IMetadataBuilder } from '../decorators/cacheToFile'
import { NotImplementedError } from '../errors/errors'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { filterMapAsync, filterMapSync } from '../utils/filters'
import { logger } from '../utils/logger'
import { buildMetadata } from './compoundV2BuildMetadata'

export abstract class CompoundV2BorrowMarketForkAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  abstract productId: string

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

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
  }

  abstract contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string }>
  >

  abstract getProtocolDetails(): ProtocolDetails

  async buildMetadata() {
    return await buildMetadata({
      chainId: this.chainId,
      provider: this.provider,
      contractAddresses: this.contractAddresses,
    })
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const comptrollerContract = CompoundV2Comptroller__factory.connect(
      this.contractAddresses[this.chainId]!.comptrollerAddress,
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

      const { protocolToken, underlyingToken } =
        await this.fetchPoolMetadata(poolContractAddress)

      const poolContract = CompoundV2Cerc20__factory.connect(
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

  getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

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
    const { protocolToken, underlyingToken } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    const cTokenContract = CompoundV2Cerc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const comptrollerContract = CompoundV2Comptroller__factory.connect(
      this.contractAddresses[this.chainId]!.comptrollerAddress,
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

  getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
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
