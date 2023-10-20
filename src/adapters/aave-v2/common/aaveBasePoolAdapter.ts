import { SimplePoolAdapter } from '../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../core/constants/chains'
import { SECONDS_PER_YEAR } from '../../../core/constants/SECONDS_PER_YEAR'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { NotApplicableError } from '../../../core/errors/errors'
import { aprToApy } from '../../../core/utils/aprToApy'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { logger } from '../../../core/utils/logger'
import {
  UnderlyingTokenRate,
  Underlying,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  MovementsByBlock,
  ProtocolTokenApr,
  ProtocolTokenApy,
  TokenBalance,
  TokenType,
  GetClaimableRewardsInput,
  ProtocolRewardPosition,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  ProtocolDataProvider,
  ProtocolDataProvider__factory,
} from '../contracts'

type AaveV2PoolMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

const protocolDataProviderContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.AaveV2]: {
    [Chain.Ethereum]: '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
    [Chain.Polygon]: '0x7551b5D2763519d4e37e8B81929D336De671d46d',
    [Chain.Avalanche]: '0x65285E9dfab318f57051ab2b139ccCf232945451',
  },
  [Protocol.AaveV3]: {
    [Chain.Ethereum]: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
    [Chain.Optimism]: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
    [Chain.Arbitrum]: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
    [Chain.Polygon]: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
    [Chain.Fantom]: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
    [Chain.Avalanche]: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
    [Chain.Base]: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
  },
}

// A RAY unit represents 27 decimal places
const RAY = 10 ** 27

// Aave tokens always pegged one to one to underlying
const PRICE_PEGGED_TO_ONE = 1
export abstract class AaveBasePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotApplicableError()
  }

  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new NotApplicableError()
  }

  async getApy({
    protocolTokenAddress,
    blockNumber,
  }: GetApyInput): Promise<ProtocolTokenApy> {
    const apr = await this.getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })

    const apy = aprToApy(apr, SECONDS_PER_YEAR)

    return {
      ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
      apyDecimal: apy * 100,
    }
  }

  async getApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<ProtocolTokenApr> {
    const apr = await this.getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })

    return {
      ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
      aprDecimal: apr * 100,
    }
  }

  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotApplicableError()
  }

  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotApplicableError()
  }

  async buildMetadata() {
    const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
      protocolDataProviderContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const reserveTokens =
      await protocolDataProviderContract.getAllReservesTokens()

    const metadataObject: AaveV2PoolMetadata = {}

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

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  protected async getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
  ): Promise<Underlying[]> {
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

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
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

  protected abstract getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string

  protected abstract getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  private async getProtocolTokenApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<number> {
    const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
      protocolDataProviderContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const underlyingTokenMetadata = (
      await this.fetchPoolMetadata(protocolTokenAddress)
    ).underlyingToken

    const reserveData = await protocolDataProviderContract.getReserveData(
      underlyingTokenMetadata.address,
      { blockTag: blockNumber },
    )

    const aprRaw = this.getReserveTokenRate(reserveData)

    return Number(aprRaw) / RAY
  }
}
