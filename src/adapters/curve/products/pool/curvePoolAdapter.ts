import { getAddress } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
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
  TokenType,
  AssetType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { queryCurvePools } from '../../common/getPoolData'

export const registryContract = {
  [Chain.Ethereum]: getAddress('0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'), // Details https://github.com/curvefi/metaregistry
  [Chain.Polygon]: getAddress('0x47bB542B9dE58b970bA50c9dae444DDB4c16751a'),
}

export class CurvePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'pool'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Curve',
      description: 'Curve pool adapter',
      siteUrl: 'https://curve.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/crv.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return queryCurvePools(this.chainId, this.provider)
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const protocolToken = await this.fetchProtocolTokenMetadata(
      protocolTokenBalance.address,
    )

    const prices = await this.getUnderlyingTokenConversionRate(
      protocolToken,
      blockNumber,
    )

    return prices.map((underlyingTokenPriceObject) => {
      const underlyingRateRawBigInt =
        underlyingTokenPriceObject.underlyingRateRaw

      const balanceRawBigInt = protocolTokenBalance.balanceRaw
      const decimalsBigInt = BigInt(10 ** protocolTokenBalance.decimals)

      const balanceRaw =
        (balanceRawBigInt * underlyingRateRawBigInt) / decimalsBigInt

      return {
        address: underlyingTokenPriceObject.address,
        name: underlyingTokenPriceObject.name,
        symbol: underlyingTokenPriceObject.symbol,
        decimals: underlyingTokenPriceObject.decimals,
        type: TokenType.Underlying,
        balanceRaw,
      }
    })
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const { underlyingTokens, protocolToken, lpTokenManager } =
      (await this.fetchPoolMetadata(protocolTokenMetadata.address)) as {
        protocolToken: Erc20Metadata
        underlyingTokens: Erc20Metadata[]
        lpTokenManager: string
      }

    const balances = await Promise.all(
      underlyingTokens.map(async (token) => {
        if (token.address == '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
          return this.provider
            .getBalance(lpTokenManager, blockNumber)
            .catch((e) => console.log(e, lpTokenManager, 'oioi2'))
        }

        const underlyingTokenContract = Erc20__factory.connect(
          token.address,
          this.provider,
        )

        return underlyingTokenContract.balanceOf(lpTokenManager, {
          blockTag: blockNumber,
        })
      }),
    )

    const lpTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const supply = await lpTokenContract.totalSupply({ blockTag: blockNumber })

    // note balances array not same size as underlying array, might be a vyper: no dynamic array limitation
    return underlyingTokens.map((underlyingToken, index) => {
      const balance = balances[index]!

      const underlyingRateRaw =
        balance / (supply / 10n ** BigInt(protocolToken.decimals))

      return {
        type: TokenType.Underlying,
        underlyingRateRaw,
        ...underlyingToken,
      }
    })
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
