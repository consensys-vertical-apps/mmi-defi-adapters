import { getAddress } from 'ethers'
import type { AdaptersController } from '../../../core/adaptersController.js'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS.js'
import { Chain } from '../../../core/constants/chains.js'
import { CacheToDb } from '../../../core/decorators/cacheToDb.js'
import { NotImplementedError } from '../../../core/errors/errors.js'
import type { Helpers } from '../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider.js'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  type GetPositionsInput,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  type TokenBalance,
  TokenType,
  type Underlying,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../types/adapter.js'
import type { Erc20Metadata } from '../../../types/erc20Metadata.js'
import { Protocol } from '../../protocols.js'
import {
  CToken__factory,
  MorphoCompoundLens__factory,
  MorphoCompound__factory,
} from '../contracts/index.js'

const morphoCompoundV2ContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoCompoundV2]: {
    [Chain.Ethereum]: getAddress('0x8888882f8f843896699869179fb6e4f7e3b58888'),
  },
}

export abstract class MorphoBasePoolAdapter implements IProtocolAdapter {
  abstract productId: string
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  abstract adapterSettings: AdapterSettings

  private provider: CustomJsonRpcProvider

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

  lensAddress = getAddress('0x930f1b46e1d081ec1524efd95752be3ece51ef67')

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const morphoCompoundContract = MorphoCompound__factory.connect(
      morphoCompoundV2ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const markets = await morphoCompoundContract.getAllMarkets()

    return await Promise.all(
      markets.map(async (marketAddress) => {
        const cTokenContract = CToken__factory.connect(
          marketAddress,
          this.provider,
        )

        const supplyTokenAddress = await cTokenContract
          .underlying()
          .catch((err) => {
            if (err) return ZERO_ADDRESS
            throw err
          })

        const [protocolToken, underlyingToken] = await Promise.all([
          getTokenMetadata(marketAddress, this.chainId, this.provider),
          getTokenMetadata(supplyTokenAddress, this.chainId, this.provider),
        ])

        return {
          ...protocolToken,
          underlyingTokens: [underlyingToken],
        }
      }),
    )
  }

  private async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const {
      underlyingTokens: [underlyingToken],
    } = await this.getProtocolTokenByAddress(protocolTokenBalance.address)

    const underlyingTokenBalance = {
      ...underlyingToken!,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const lensContract = MorphoCompoundLens__factory.connect(
      this.lensAddress,
      this.provider,
    )
    const tokens = await this.getProtocolTokens()
    const positionType = this.getProtocolDetails().positionType

    const getBalance = async (
      market: Erc20Metadata,
      userAddress: string,
      blockNumber: number,
    ): Promise<bigint> => {
      let balanceRaw: bigint
      if (positionType === PositionType.Supply) {
        ;[, , balanceRaw] = await lensContract.getCurrentSupplyBalanceInOf(
          market.address,
          userAddress,
          { blockTag: blockNumber },
        )
      } else {
        ;[, , balanceRaw] = await lensContract.getCurrentBorrowBalanceInOf(
          market.address,
          userAddress,
          { blockTag: blockNumber },
        )
      }
      return balanceRaw
    }

    const protocolTokensBalances = await Promise.all(
      tokens.map(async (market) => {
        const amount = await getBalance(market, userAddress, blockNumber!)
        return {
          address: market.address,
          balance: amount,
        }
      }),
    )

    const protocolTokens: ProtocolPosition[] = await Promise.all(
      protocolTokensBalances
        .filter((protocolTokenBalance) => protocolTokenBalance.balance !== 0n) // Filter out balances equal to 0
        .map(async (protocolTokenBalance) => {
          const protocolToken = await this.getProtocolTokenByAddress(
            protocolTokenBalance.address,
          )

          const completeTokenBalance: TokenBalance = {
            address: protocolTokenBalance.address,
            balanceRaw: protocolTokenBalance.balance,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          }

          const underlyingTokenBalances = await this.getUnderlyingTokenBalances(
            {
              userAddress,
              protocolTokenBalance: completeTokenBalance,
              blockNumber,
            },
          )

          return {
            ...protocolTokenBalance,
            balanceRaw: protocolTokenBalance.balance,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
            type: TokenType.Protocol,
            tokens: underlyingTokenBalances,
          }
        }),
    )
    return protocolTokens
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
