import { formatUnits } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter.js'
import { Chain } from '../../../../core/constants/chains.js'
import { Adapter } from '../../../../core/decorators/adapter.js'
import { CacheToFile } from '../../../../core/decorators/cacheToFile.js'
import {
  Erc20Metadata,
  getThinTokenMetadata,
} from '../../../../core/utils/getTokenMetadata.js'
import { logger } from '../../../../core/utils/logger.js'
import { IMetadataBuilder } from '../../../../core/utils/metadata.js'
import {
  BasePricePerShareToken,
  BaseToken,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolTotalValueLockedToken,
  TokenBalance,
  TokenType,
} from '../../../../types/adapter.js'
import {
  StargateFactory__factory,
  StargateToken__factory,
} from '../../contracts/index.js'

type StargatePoolMetadata = Record<
  string,
  {
    poolId: number
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

@Adapter
export class StargatePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  product!: string

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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new Error('Not Implemented')
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]> {
    throw new Error('Not Implemented')
  }

  async getApy(_input: GetApyInput): Promise<ProtocolApyToken> {
    throw new Error('Not Implemented')
  }

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
    throw new Error('Not Implemented')
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
        underlyingToken,
      }
    }

    return metadataObject
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  protected async getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
  ): Promise<BaseToken[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: protocolTokenBalance.balanceRaw,
      balance: protocolTokenBalance.balance,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async getUnderlyingTokenPricesPerShare(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<BasePricePerShareToken[]> {
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
        pricePerShareRaw,
        pricePerShare,
      },
    ]
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
