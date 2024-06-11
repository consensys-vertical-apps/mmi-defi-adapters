import { BytesLike, Interface, TransactionResponse, getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain, ChainName } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { Replacements } from '../../../../scripts/replacements'
import { RewardsAdapter } from '../../../../scripts/rewardAdapter'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { TokenType } from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'

import { log } from 'console'
import { Json } from '../../../../types/json'
import {
  TanxFastWithdrawal__factory,
  TanxStarkex__factory,
} from '../../contracts'
import {
  BridgedDepositEvent,
  BridgedWithdrawalEvent,
} from '../../contracts/TanxFastWithdrawal'
import {
  LogDepositEvent,
  LogWithdrawalPerformedEvent,
  TanxStarkexInterface,
} from '../../contracts/TanxStarkex'

type TanxErc20Metadata = Erc20Metadata & {
  assetId?: string
}

type Metadata = Record<
  string,
  {
    protocolToken: TanxErc20Metadata
  }
>

const contractAddresses: Partial<Record<Chain, Record<string, string>>> = {
  [Chain.Ethereum]: {
    starkexContract: '0x1390f521A79BaBE99b69B37154D63D431da27A07',
    fastWithdrawalContract: '0xe17F8e501bF5e968e39D8702B30c3A8b955d8f52',
  },
  [Chain.Polygon]: {
    fastWithdrawalContract: '0x2714C5958e2b1417B3f2b7609202FFAD359a5965',
  },
  [Chain.Optimism]: {
    fastWithdrawalContract: '0xBdd40916bBC43bE14dd7183C30a64EE4A893D97f',
  },
  [Chain.Arbitrum]: {
    fastWithdrawalContract: '0x149e2C169f10914830EF39B9d184AE62BbCdF526',
  },
  [Chain.Linea]: {
    fastWithdrawalContract: '0x508f001baa00976fc1d679af880267555900ab09',
  },
}

type LogDetails = {
  ethAddress: string
  starkKey: string
  vaultId: bigint
  assetId: string
  protocolTokenAddress: string
  nonQuantizedAmount: bigint
  quantizedAmount: bigint
}

const AssetSymbolNameMap: Record<string | number | symbol, string> = {
  eth: 'Ethereum',
  usdc: 'USDC',
  usdt: 'Tether',
}

export class TanxFinanceDexAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'dex'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

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
      name: 'TanxFinance',
      description: 'TanxFinance defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-tokens' })
  async buildMetadata(): Promise<Metadata> {
    const coinConfigUrl = 'https://api.tanx.fi/main/stat/v2/coins/'
    const appAndMarketsUrl = 'https://api.tanx.fi/main/stat/v2/app-and-markets/'
    const coinConfigResults = await (
      await fetch(`${coinConfigUrl}`, {
        method: 'POST',
      })
    ).json()

    const appAndMarketsResults = await (
      await fetch(`${appAndMarketsUrl}`, {
        method: 'POST',
      })
    ).json()

    const metadata = {} as Metadata

    if (this.chainId === Chain.Ethereum) {
      Object.keys(coinConfigResults.payload).forEach((key, index) => {
        const name = coinConfigResults.payload[key].name
        const tokenContract =
          name === 'Ethereum'
            ? '0x0000000000000000000000000000000000000000'
            : getAddress(coinConfigResults.payload[key].token_contract)
        metadata[tokenContract] = { protocolToken: {} as TanxErc20Metadata }
        metadata[tokenContract]!.protocolToken = {
          address: tokenContract,
          name: name,
          assetId: coinConfigResults.payload[key].stark_asset_id,
          decimals: Number(coinConfigResults.payload[key].decimal),
          symbol: coinConfigResults.payload[key].symbol,
        }
      })
    } else {
      const networkConfig = appAndMarketsResults.payload.network_config
      const network = ChainName[this.chainId].toUpperCase()
      const networkConfigTokens = networkConfig[network].tokens

      Object.keys(networkConfigTokens).forEach((key, index) => {
        const tokenContract = networkConfigTokens[key].token_contract
        metadata[tokenContract] = { protocolToken: {} as TanxErc20Metadata }
        metadata[tokenContract]!.protocolToken = {
          address: tokenContract,
          name: key,
          decimals: Number(networkConfigTokens[key].blockchain_decimal),
          symbol: (AssetSymbolNameMap.hasOwnProperty(key)
            ? AssetSymbolNameMap[key]
            : key.toUpperCase())!,
        }
      })
    }
    return metadata
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const movements = await this.getTanxMovements(
      {
        userAddress,
        fromBlock,
        toBlock,
        protocolTokenAddress,
      },
      'withdrawals',
    )

    return movements
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const movements = await this.getTanxMovements(
      {
        userAddress,
        fromBlock,
        toBlock,
        protocolTokenAddress,
      },
      'deposits',
    )

    return movements
  }

  async formatLogData(
    logs:
      | LogDepositEvent.Log[]
      | LogWithdrawalPerformedEvent.Log[]
      | BridgedDepositEvent.Log[]
      | BridgedWithdrawalEvent.Log[],
    userAddress: string,
    protocolTokenAddress: string,
    controllerInterface: Interface,
    eventType: 'deposit' | 'withdrawal',
    contractType: 'starkex' | 'fastWithdrawal' = 'starkex',
    currentBalance: bigint = BigInt(0),
  ): Promise<MovementsByBlock[]> {
    const metadata = await this.buildMetadata()
    let amount = BigInt(0) + currentBalance

    const transactionHashes: string[] = []

    if (contractType === 'starkex') {
      if (eventType === 'deposit') {
        amount += logs
          .map((item) => {
            const log = item.args

            const ethAddress = log[0] as string
            const starkKey = `0x${(log[1] as bigint).toString(16)}`
            const vaultId = log[2]
            const assetId = `0x${(log[3] as bigint).toString(16)}`
            const nonQuantizedAmount = log[4] as bigint
            const quantizedAmount = log[5] as bigint

            const token = Object.keys(metadata).find((key, index) => {
              if (metadata[key]?.protocolToken.assetId === assetId) {
                return true
              }
            })

            if (token !== protocolTokenAddress) return

            transactionHashes.push(item.transactionHash)

            const details: LogDetails = {
              ethAddress,
              starkKey,
              vaultId,
              assetId,
              protocolTokenAddress: token!,
              nonQuantizedAmount,
              quantizedAmount,
            }

            return details
          })
          .filter(
            (item) =>
              item?.ethAddress === userAddress &&
              item?.protocolTokenAddress === protocolTokenAddress,
          )
          .reduce((acc, item) => item?.quantizedAmount! + acc, BigInt(0))
      } else { // withdrawals
        amount += logs
          .map((item) => {
            const log = item.args

            const starkKey = `0x${(log[0] as bigint).toString(16)}`
            const assetId = `0x${(log[1] as bigint).toString(16)}`
            const nonQuantizedAmount = log[2] as bigint
            const quantizedAmount = log[3] as bigint
            const ethAddress = log[4] as string

            const token = Object.keys(metadata).find((key, index) => {
              if (metadata[key]?.protocolToken.assetId === assetId) {
                return true
              }
            })

            if (token !== protocolTokenAddress) return

            transactionHashes.push(item.transactionHash)

            const details: Omit<LogDetails, 'vaultId'> = {
              ethAddress,
              starkKey,
              assetId,
              protocolTokenAddress: token!,
              nonQuantizedAmount,
              quantizedAmount,
            }

            return details
          })
          .filter(
            (item) =>
              item?.ethAddress === userAddress &&
              item?.protocolTokenAddress === protocolTokenAddress,
          )
          .reduce((acc, item) => item?.quantizedAmount! + acc, BigInt(0))
      }
    } else { // fast withdrawal contract
      amount += logs
        .map((item) => {
          const log = item.args

          const ethAddress = log[0] as string
          const token = log[1] as string
          const quantizedAmount = log[2] as bigint

          const details: Pick<
            LogDetails,
            'ethAddress' | 'protocolTokenAddress' | 'quantizedAmount'
          > = {
            ethAddress,
            protocolTokenAddress: token!,
            quantizedAmount,
          }

          transactionHashes.push(item.transactionHash)

          return details
        })
        .reduce((acc, item) => item.quantizedAmount + acc, BigInt(0))
    }

    const movementsByBlock: MovementsByBlock[] =
      amount > 0
        ? logs
            .filter((log) => transactionHashes.includes(log.transactionHash))
            .map((log) => {
              const { blockNumber, transactionHash } = log
              return {
                transactionHash,
                blockNumber,
                protocolToken: metadata[protocolTokenAddress!]?.protocolToken!,
                tokens: [
                  {
                    type: TokenType.Underlying,
                    balanceRaw: BigInt(amount),
                    ...metadata[protocolTokenAddress!]?.protocolToken!,
                    transactionHash,
                    blockNumber,
                  },
                ],
              }
            })
        : []

    return movementsByBlock
  }

  getCurrentRawBalanceFromMovements(
    movements: MovementsByBlock[],
  ): bigint {
    if (movements.length == 0) return BigInt(0)
    return movements.reduce((acc, movement) => movement?.tokens[0]?.balanceRaw! + acc, BigInt(0))
  }

  async getTanxMovements(
    { userAddress, fromBlock, toBlock, protocolTokenAddress }: GetEventsInput,
    eventType: 'deposits' | 'withdrawals',
  ): Promise<MovementsByBlock[]> {
    const tanxFastWithdrawalContract = TanxFastWithdrawal__factory.connect(
      contractAddresses[this.chainId]!.fastWithdrawalContract!,
      this.provider,
    )

    const eventFilters = {
      Deposit: tanxFastWithdrawalContract.filters.BridgedDeposit(
        userAddress,
        protocolTokenAddress,
      ),
      Withdrawal: tanxFastWithdrawalContract.filters.BridgedWithdrawal(
        userAddress,
        protocolTokenAddress,
      ),
    }

    const movements: MovementsByBlock[] = []

    try {
      if (eventType === 'deposits') {
        const depositEvents = await tanxFastWithdrawalContract.queryFilter(
          eventFilters['Deposit'],
          fromBlock,
          toBlock,
        )

        const movement = await this.formatLogData(
          depositEvents,
          userAddress,
          protocolTokenAddress,
          tanxFastWithdrawalContract.interface,
          'deposit',
          'fastWithdrawal',
        )
        movements.push(...movement)
      } else {
        const withdrawalEvents = await tanxFastWithdrawalContract.queryFilter(
          eventFilters['Withdrawal'],
          fromBlock,
          toBlock,
        )

        const movement = await this.formatLogData(
          withdrawalEvents,
          userAddress,
          protocolTokenAddress,
          tanxFastWithdrawalContract.interface,
          'withdrawal',
          'fastWithdrawal',
        )
        movements.push(...movement)
      }
    } catch (error) {
      console.log(error)
    }

    if (this.chainId === Chain.Ethereum) {
      const tanxControllerContract = TanxStarkex__factory.connect(
        contractAddresses[this.chainId]!.starkexContract!,
        this.provider,
      )

      const starkexEventFilters = {
        Deposit: tanxControllerContract.filters.LogDeposit(),
        Withdrawal: tanxControllerContract.filters.LogWithdrawalPerformed(),
      }

      const currentBalance = this.getCurrentRawBalanceFromMovements(movements)

      try {
        if (eventType === 'deposits') {
          const starkexDepositEvents = await tanxControllerContract.queryFilter(
            starkexEventFilters['Deposit'],
            fromBlock,
            toBlock,
          )

          const movement = await this.formatLogData(
            starkexDepositEvents,
            userAddress,
            protocolTokenAddress,
            tanxControllerContract.interface, // add movements to parameters to get the balance from fast withdrawal contract
            'deposit',
            'starkex',
            currentBalance,
          )
          movements.push(...movement)
        } else {
          const starkexWithdrawalEvents =
            await tanxControllerContract.queryFilter(
              starkexEventFilters['Withdrawal'],
              fromBlock,
              toBlock,
            )

          const movement = await this.formatLogData(
            starkexWithdrawalEvents,
            userAddress,
            protocolTokenAddress,
            tanxControllerContract.interface,
            'withdrawal',
            'starkex',
            currentBalance
          )
          movements.push(...movement)
        }
      } catch (error) {
        console.log(error)
      }
    }
    return movements
  }
}
