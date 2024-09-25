import { ZeroAddress, getAddress } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  GetTotalValueLockedInput,
  PositionType,
  ProtocolDetails,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { XfaiFactory__factory, XfaiPool__factory } from '../../contracts'

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
}

export class XfaiDexAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'dex'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false, // might be true but contracts not verified
    includeInUnwrap: true,
    version: 2,
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

  @CacheToFile({ fileKey: 'lp-token' })
  async getProtocolTokens() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Linea]: getAddress('0xa5136eAd459F0E61C99Cec70fe8F5C24cF3ecA26'),
    }

    const lpFactoryContract = XfaiFactory__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )

    const poolsLength = Number(await lpFactoryContract.allPoolsLength())

    const metadataObject: ProtocolToken<AdditionalMetadata>[] = []

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

  async getTotalValueLocked({
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const lps = await this.getProtocolTokens()

    return Promise.all(
      Object.values(lps).map(
        async ({ name, address, symbol, decimals, underlyingTokens }) => {
          const underlyingTokenBalances = filterMapAsync(
            underlyingTokens,
            async (underlyingToken: Erc20Metadata) => {
              if (underlyingToken.address === ZERO_ADDRESS) {
                const balanceOf = await this.provider
                  .getBalance(address, blockNumber)
                  .catch(() => 0n)
                return {
                  ...underlyingToken,
                  totalSupplyRaw: balanceOf,
                  type: TokenType.Underlying,
                }
              }

              const contract = Erc20__factory.connect(
                underlyingToken.address,
                this.provider,
              )

              const balanceOf = await contract
                .balanceOf(address, {
                  blockTag: blockNumber,
                })
                .catch(() => 0n)

              return {
                ...underlyingToken,
                totalSupplyRaw: balanceOf,
                type: TokenType.Underlying,
              }
            },
          )
          const contract = Erc20__factory.connect(address, this.provider)

          return {
            type: 'protocol',
            name,
            address,
            symbol,
            decimals,
            tokens: await underlyingTokenBalances,
            totalSupplyRaw: await contract.totalSupply({
              blockTag: blockNumber,
            }),
          } as ProtocolTokenTvl
        },
      ),
    )
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
