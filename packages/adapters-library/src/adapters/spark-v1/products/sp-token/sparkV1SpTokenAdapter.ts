import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
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
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'

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
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import {
  ProtocolDataProvider,
  ProtocolDataProvider__factory,
} from '../../contracts'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
const PRICE_PEGGED_TO_ONE = 1

const sparkEthereumProviderAddress = "0xFc21d6d146E6086B8359705C8b28512a983db0cb"

type SparkMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

export class SparkV1SpTokenAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'sp-token'
  // protocolId: Protocol
  // chainId: Chain
  // helpers: Helpers

  // private provider: CustomJsonRpcProvider

  // adaptersController: AdaptersController

  // constructor({
  //   provider,
  //   chainId,
  //   protocolId,
  //   adaptersController,
  //   helpers,
  // }: ProtocolAdapterParams) {
  //   this.provider = provider
  //   this.chainId = chainId
  //   this.protocolId = protocolId
  //   this.adaptersController = adaptersController
  //   this.helpers = helpers
  // }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'SparkV1',
      description: 'SparkV1 defi adapter',
      siteUrl: 'https://spark.fi',
      iconUrl: 'https://github.com/marsfoundation/spark-app/blob/main/packages/app/public/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'sp-token-v1' })
  async buildMetadata(): Promise<SparkMetadata> {
    const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
      sparkEthereumProviderAddress,
      this.provider,
    )

    const reserveTokens = await protocolDataProviderContract.getAllReservesTokens()

    const metadataObject: SparkMetadata = {}

    const promises = reserveTokens.map(async ({ tokenAddress }) => {
      const reserveConfigurationData =
        await protocolDataProviderContract.getReserveConfigurationData(
          tokenAddress,
        )

      if (
        !reserveConfigurationData.isActive ||
        reserveConfigurationData.isFrozen
      ) {
        return
      }

      const reserveTokenAddresses =
        await protocolDataProviderContract.getReserveTokensAddresses(
          tokenAddress,
        )

      const protocolTokenPromise = getTokenMetadata(
        this.getReserveTokenAddress(reserveTokenAddresses),
        this.chainId,
        this.provider,
      )
      const underlyingTokenPromise = getTokenMetadata(
        tokenAddress,
      this.chainId,
      this.provider,
      )

      const [protocolToken, underlyingToken] = await Promise.all([
        protocolTokenPromise,
        underlyingTokenPromise,
      ])

      metadataObject[protocolToken.address] = {
        protocolToken,
        underlyingToken,
      }
    })

    await Promise.all(promises)

    return metadataObject  
  }                 

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string {
    return reserveTokenAddresses.aTokenAddress
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return [underlyingToken]
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
      const { underlyingToken } = await this.fetchPoolMetadata(
        protocolTokenMetadata.address,
      )

      // Aave tokens always pegged one to one to underlying
      const pricePerShareRaw = BigInt(
        PRICE_PEGGED_TO_ONE * 10 ** protocolTokenMetadata.decimals,
      )

      return [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw: pricePerShareRaw,
        },
      ]
    }

  // async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
  //   return this.helpers.getBalanceOfTokens({
  //     ...input,
  //     protocolTokens: await this.getProtocolTokens(),
  //   })
  // }

  // async getWithdrawals({
  //   protocolTokenAddress,
  //   fromBlock,
  //   toBlock,
  //   userAddress,
  // }: GetEventsInput): Promise<MovementsByBlock[]> {
  //   return this.helpers.withdrawals({
  //     protocolToken: await this.getProtocolToken(protocolTokenAddress),
  //     filter: { fromBlock, toBlock, userAddress },
  //   })
  // }

  // async getDeposits({
  //   protocolTokenAddress,
  //   fromBlock,
  //   toBlock,
  //   userAddress,
  // }: GetEventsInput): Promise<MovementsByBlock[]> {
  //   return this.helpers.deposits({
  //     protocolToken: await this.getProtocolToken(protocolTokenAddress),
  //     filter: { fromBlock, toBlock, userAddress },
  //   })
  // }

  // async getTotalValueLocked({
  //   protocolTokenAddresses,
  //   blockNumber,
  // }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
  //   const protocolTokens = await this.getProtocolTokens()

  //   return await this.helpers.tvl({
  //     protocolTokens,
  //     filterProtocolTokenAddresses: protocolTokenAddresses,
  //     blockNumber,
  //   })
  // }

  // async unwrap({
  //   protocolTokenAddress,
  //   tokenId,
  //   blockNumber,
  // }: UnwrapInput): Promise<UnwrapExchangeRate> {
  //   return this.helpers.unwrapOneToOne({
  //     protocolToken: await this.getProtocolToken(protocolTokenAddress),
  //     underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
  //   })
  // }

  // private async getProtocolToken(protocolTokenAddress: string) {
  //   return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  // }
  // private async getUnderlyingTokens(protocolTokenAddress: string) {
  //   return (await this.fetchPoolMetadata(protocolTokenAddress)).underlyingTokens
  // }

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
