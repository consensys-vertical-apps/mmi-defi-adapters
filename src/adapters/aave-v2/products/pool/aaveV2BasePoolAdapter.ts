import { formatUnits } from 'ethers/lib/utils'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  Erc20Metadata,
  getThinTokenMetadata,
} from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  IMetadataBuilder,
  fetchMetadata,
  writeMetadataToFile,
} from '../../../../core/utils/metadata'
import {
  BasePricePerShareToken,
  BaseToken,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolTotalValueLockedToken,
  TokenBalance,
  TokenType,
} from '../../../../types/adapter'
import {
  ProtocolDataProvider,
  ProtocolDataProvider__factory,
} from '../../contracts'

type AaveV2PoolMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

export abstract class AaveV2BasePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.fetchMetadata()).map(
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

  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]: '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
      [Chain.Polygon]: '0x7551b5D2763519d4e37e8B81929D336De671d46d',
      [Chain.Avalanche]: '0x65285E9dfab318f57051ab2b139ccCf232945451',
    }

    const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )

    const reserveTokens =
      await protocolDataProviderContract.getAllReservesTokens()

    const metadataObject: AaveV2PoolMetadata = {}
    for (const { tokenAddress } of reserveTokens) {
      const reserveTokenAddresses =
        await protocolDataProviderContract.getReserveTokensAddresses(
          tokenAddress,
        )

      const underlyingTokenMetadata = await getThinTokenMetadata(
        tokenAddress,
        this.chainId,
      )

      const setProtocolToken = async (
        tokenAddress: string,
        tokenMetadataObject: AaveV2PoolMetadata,
      ) => {
        const protocolTokenMetadata = await getThinTokenMetadata(
          tokenAddress,
          this.chainId,
        )
        tokenMetadataObject[protocolTokenMetadata.address] = {
          protocolToken: protocolTokenMetadata,
          underlyingToken: underlyingTokenMetadata,
        }
      }

      setProtocolToken(
        this.getReserveTokenAddress(reserveTokenAddresses),
        metadataObject,
      )
    }

    await writeMetadataToFile({
      protocolId: this.protocolId,
      product: 'pool',
      chainId: this.chainId,
      fileName: this.getMetadataFileName(),
      metadataObject,
    })
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken: protocolTokenMetadata } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolTokenMetadata
  }

  protected async getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken: underlyingTokenMetadata } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return [underlyingTokenMetadata]
  }

  protected async getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
  ): Promise<BaseToken[]> {
    const { underlyingToken: underlyingTokenMetadata } =
      await this.fetchPoolMetadata(protocolTokenBalance.address)

    const underlyingTokenBalance = {
      ...underlyingTokenMetadata,
      balanceRaw: protocolTokenBalance.balanceRaw,
      balance: protocolTokenBalance.balance,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async getUnderlyingTokenPricesPerShare(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<BasePricePerShareToken[]> {
    const { underlyingToken: underlyingTokenMetadata } =
      await this.fetchPoolMetadata(protocolTokenMetadata.address)

    const pricePerShareRaw = BigInt(1 * 10 ** protocolTokenMetadata.decimals)

    const pricePerShare = formatUnits(
      pricePerShareRaw,
      underlyingTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingTokenMetadata,
        type: TokenType.Underlying,
        pricePerShareRaw,
        pricePerShare,
      },
    ]
  }

  protected abstract getMetadataFileName(): string

  protected abstract getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.fetchMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  private async fetchMetadata(): Promise<AaveV2PoolMetadata> {
    return fetchMetadata({
      productDir: __dirname,
      fileName: this.getMetadataFileName(),
      chainId: this.chainId,
    })
  }
}
