import { formatUnits } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { getThinTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  UnderlyingTokenRate,
  Underlying,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolDetails,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  GetClaimableRewardsInput,
  ProtocolRewardPosition,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  StargateFactory__factory,
  StargateToken__factory,
} from '../../contracts'

type StargatePoolMetadata = Record<
  string,
  {
    poolId: number
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata & { iconUrl: string }
  }
>

export class StargatePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  product = 'pool'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Stargate',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
    }
  }

  @CacheToFile({ fileKey: 'lp-token' })
  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]: '0x06D538690AF257Da524f25D0CD52fD85b1c2173E',
      [Chain.Arbitrum]: '0x55bDb4164D28FBaF0898e0eF14a589ac09Ac9970',
    }

    const lpFactoryContract = StargateFactory__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )

    const poolsLength = Number(await lpFactoryContract.allPoolsLength())

    const metadataObject: StargatePoolMetadata = {}

    for (let i = 0; i < poolsLength; i++) {
      const poolAddress = (await lpFactoryContract.allPools(i)).toLowerCase()

      const poolContract = StargateToken__factory.connect(
        poolAddress,
        this.provider,
      )

      const poolId = Number(await poolContract.poolId())
      const underlyingTokenAddress = (await poolContract.token()).toLowerCase()

      const protocolToken = await getThinTokenMetadata(
        poolAddress,
        this.chainId,
      )
      const underlyingToken = await getThinTokenMetadata(
        underlyingTokenAddress,
        this.chainId,
      )

      metadataObject[poolAddress] = {
        poolId,
        protocolToken,
        underlyingToken: {
          ...underlyingToken,
          iconUrl: buildTrustAssetIconUrl(
            this.chainId,
            underlyingToken.address,
          ),
        },
      }
    }

    return metadataObject
  }

  protected async getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
    blockNumber?: number,
  ): Promise<Underlying[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const balanceRaw = await StargateToken__factory.connect(
      protocolTokenBalance.address,
      this.provider,
    ).amountLPtoLD(protocolTokenBalance.balanceRaw, {
      blockTag: blockNumber,
    })

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    const oneToken = BigInt(1 * 10 ** protocolTokenMetadata.decimals)

    const pricePerShareRaw = await StargateToken__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    ).amountLPtoLD(oneToken, {
      blockTag: blockNumber,
    })

    const pricePerShare = formatUnits(
      pricePerShareRaw,
      underlyingToken.decimals,
    )

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
        underlyingRate: pricePerShare,
      },
    ]
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new Error('Implement me')
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new Error('Implement me')
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new Error('Implement me')
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new Error('Implement me')
  }
  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new Error('Implement me')
  }

  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new Error('Implement me')
  }

  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new Error('Implement me')
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

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
