import { ZeroAddress, getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
  TokenType,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { XfaiFactory__factory, XfaiPool__factory } from '../../contracts'

export class XfaiDexAdapter extends SimplePoolAdapter {
  productId = 'dex'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Xfai',
      description: 'Xfai pool adapter',
      siteUrl: 'https://xfai.com',
      iconUrl: 'https://assets.xfai.com/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: getAddress('0xa5136eAd459F0E61C99Cec70fe8F5C24cF3ecA26'),
    }

    const lpFactoryContract = XfaiFactory__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )

    const poolsLength = Number(await lpFactoryContract.allPoolsLength())

    const metadataObject: ProtocolToken[] = []

    const promises = Array.from({ length: poolsLength }, async (_, i) => {
      const poolAddress = await lpFactoryContract.allPools(i)

      const poolContract = XfaiPool__factory.connect(poolAddress, this.provider)

      const underlyingTokenAddress = await poolContract.poolToken()

      const protocolTokenPromise = getTokenMetadata(
        poolAddress,
        this.chainId,
        this.provider,
      )
      const underlyingTokenPromise = getTokenMetadata(
        underlyingTokenAddress,
        this.chainId,
        this.provider,
      )

      const [protocolToken, underlyingToken] = await Promise.all([
        protocolTokenPromise,
        underlyingTokenPromise,
      ])

      metadataObject.push({
        ...protocolToken,
        underlyingTokens: [
          underlyingToken,
          {
            address: ZERO_ADDRESS,
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
          },
        ],
      })
    })

    await Promise.all(promises)

    return metadataObject
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const poolAddress = protocolTokenMetadata.address
    const poolContract = XfaiPool__factory.connect(poolAddress, this.provider)
    const poolMeta = await this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress: poolAddress,
    })

    const nonEthToken = poolMeta.underlyingTokens.find(
      (t) => t.address !== ZERO_ADDRESS,
    )!

    const [totalSupply, [tokenAmount, ethAmount]] = await Promise.all([
      poolContract.totalSupply({
        blockTag: blockNumber,
      }),
      poolContract.getStates({
        blockTag: blockNumber,
      }),
    ])

    const oneLpUnit =
      BigInt(1 * 10 ** protocolTokenMetadata.decimals) / totalSupply

    return [
      {
        type: TokenType.Underlying,
        ...nonEthToken,
        underlyingRateRaw: (oneLpUnit * tokenAmount) / totalSupply,
      },
      {
        type: TokenType.Underlying,
        address: ZeroAddress,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        underlyingRateRaw: (oneLpUnit * ethAmount) / totalSupply,
      },
    ]
  }
}
