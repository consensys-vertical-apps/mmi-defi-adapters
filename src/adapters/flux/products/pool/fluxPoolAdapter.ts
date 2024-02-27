import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
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
  AssetType,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Comptroller__factory, FToken__factory } from '../../contracts'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { Oracle__factory } from '../../../mendi-finance/contracts'

type FluxAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export class FluxPoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'pool'

  // Expected blocks per year
  static readonly EXPECTED_BLOCKS_PER_YEAR = 2628000

  // https://docs.fluxfinance.com/addresses
  static readonly ousgOracleAddress = getAddress(
    '0x0502c5ae08E7CD64fe1AEDA7D6e229413eCC6abe',
  )
  static readonly comptrollerAddress = getAddress(
    '0x95Af143a021DF745bc78e845b54591C53a8B3A51',
  )
  static readonly lensAddress = getAddress(
    '0xcA83471CE9B0E7E6f628FA2A95Ae97198780acf8',
  )

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Flux',
      description: 'Flux pool adapter',
      siteUrl: 'https://fluxfinance.com',
      iconUrl: 'https://docs.fluxfinance.com/img/favicon.svg',
      positionType: PositionType.Lend,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    // Get all the protocol tokens
    const comptrollerContract = Comptroller__factory.connect(
      FluxPoolAdapter.comptrollerAddress,
      this.provider,
    )
    const protocolTokens = await comptrollerContract.getAllMarkets()
    const protocolTokensMetadata = await Promise.all(
      protocolTokens.map((protocolTokenAddress) =>
        getTokenMetadata(protocolTokenAddress, this.chainId, this.provider),
      ),
    )

    // Get all the underlying tokens for each protocol token and build metadata
    const fluxAdapterMetaData: FluxAdapterMetadata = {}
    protocolTokensMetadata.forEach(async (protocolTokenMetadata) => {
      const fTokenContract = FToken__factory.connect(
        protocolTokenMetadata.address,
        this.provider,
      )
      const underlyingToken = await fTokenContract.underlying()
      const underlyingTokenMetadata = await getTokenMetadata(
        underlyingToken,
        this.chainId,
        this.provider,
      )
      fluxAdapterMetaData[protocolTokenMetadata.address] = {
        protocolToken: protocolTokenMetadata,
        underlyingTokens: [underlyingTokenMetadata],
      }
    })

    return fluxAdapterMetaData
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances({
    userAddress,
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const poolMetadata = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )
    const underlyingTokenConversionRate =
      await this.getUnderlyingTokenConversionRate(
        protocolTokenBalance,
        blockNumber,
      )
    const underlyingBalances = poolMetadata.underlyingTokens.map((token) => {
      const underlyingTokenRateRaw = underlyingTokenConversionRate.find(
        (tokenRate) => tokenRate.address === token.address,
      )!.underlyingRateRaw
      return {
        ...token,
        balanceRaw:
          (underlyingTokenRateRaw * protocolTokenBalance.balanceRaw) /
          10n ** BigInt(protocolTokenBalance.decimals),
        type: TokenType.Underlying,
      }
    })

    return underlyingBalances
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()
    return Promise.all(
      protocolTokens.map(async (tokenMetadata) => {
        const fTokenContract = FToken__factory.connect(
          tokenMetadata.address,
          this.provider,
        )
        const totalSupplyRaw = await fTokenContract.totalSupply()
        return {
          ...tokenMetadata,
          type: TokenType.Protocol,
          totalSupplyRaw,
        }
      }),
    )
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)
    return protocolToken
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const fTokenContract = FToken__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )
    const exchangeRate = await fTokenContract.exchangeRateStored({
      blockTag: blockNumber,
    })
    const underlyingTokenMetadata = (
      await this.fetchUnderlyingTokensMetadata(protocolTokenMetadata.address)
    )[0]!
    return [
      {
        ...underlyingTokenMetadata,
        type: TokenType.Underlying,
        underlyingRateRaw: exchangeRate,
      },
    ]
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )
    return underlyingTokens
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
