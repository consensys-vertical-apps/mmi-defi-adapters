import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { filterMapAsync } from '../../../../core/utils/filters'
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
import {
  BalancerPoolDataQueries__factory,
  Vault__factory,
} from '../../contracts'
import { PoolBalanceChangedEvent } from '../../contracts/Vault'

type AdditionalMetadata = {
  poolId: string
  totalSupplyType: string
  underlyingTokensIndexes: number[]
}

const vaultContractAddresses: Partial<Record<Chain, string>> = {
  [Chain.Linea]: getAddress('0x286381aEdd20e51f642fE4A200B5CB2Fe3729695'),
}
const poolDataQueryContractAddresses: Partial<Record<Chain, string>> = {
  [Chain.Linea]: getAddress('0xb2F2537E332F9A1aADa289df9fC770D5120613C9'),
}

export class ChimpExchangePoolAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'pool'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ChimpExchange',
      description: 'ChimpExchange pool adapter',
      siteUrl: 'https://app.chimp.exchange',
      iconUrl: 'https://chimp.exchange/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens() {
    const vaultContract = Vault__factory.connect(
      vaultContractAddresses[this.chainId]!,
      this.provider,
    )

    const eventFilter = vaultContract.filters.PoolRegistered()
    const events = await vaultContract.queryFilter(eventFilter)

    const metadata: ProtocolToken<AdditionalMetadata>[] = []
    await Promise.all(
      events.map(async (event) => {
        const protocolToken = await getTokenMetadata(
          event.args.poolAddress,
          this.chainId,
          this.provider,
        )

        const poolTokens = await vaultContract.getPoolTokens(event.args.poolId)

        const underlyingTokens = await filterMapAsync(
          poolTokens[0],
          async (token, index) => {
            if (getAddress(token) === getAddress(event.args.poolAddress)) {
              return undefined
            }

            const tokenMetadata = await getTokenMetadata(
              token,
              this.chainId,
              this.provider,
            )

            return {
              ...tokenMetadata,
              index,
            }
          },
        )

        metadata.push({
          poolId: event.args.poolId,
          totalSupplyType: event.args.specialization === 0n ? '2' : '0',
          ...protocolToken,
          underlyingTokens: underlyingTokens.map((underlyingToken) => {
            return {
              name: underlyingToken.name,
              address: underlyingToken.address,
              decimals: underlyingToken.decimals,
              symbol: underlyingToken.symbol,
            }
          }),
          underlyingTokensIndexes: underlyingTokens.map(
            (underlyingToken) => underlyingToken.index,
          ),
        })
      }),
    )

    return metadata
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const vaultContract = Vault__factory.connect(
      vaultContractAddresses[this.chainId]!,
      this.provider,
    )
    const balancerPoolDataQueriesContract =
      BalancerPoolDataQueries__factory.connect(
        poolDataQueryContractAddresses[this.chainId]!,
        this.provider,
      )

    const poolMetadata = await this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress: protocolTokenMetadata.address,
    })

    const [_poolTokens, poolBalances] = await vaultContract.getPoolTokens(
      poolMetadata.poolId,
      {
        blockTag: blockNumber,
      },
    )

    const [totalSupplyRaw] =
      await balancerPoolDataQueriesContract.getTotalSupplyForPools(
        [protocolTokenMetadata.address],
        [poolMetadata.totalSupplyType],
        {
          blockTag: blockNumber,
        },
      )

    const underlyingRates = poolMetadata.underlyingTokens.map(
      ({ ...token }, index) => {
        const underlyingPoolBalance =
          poolBalances[poolMetadata.underlyingTokensIndexes[index]!]!
        const underlyingRateRaw =
          totalSupplyRaw === 0n
            ? 0n
            : underlyingPoolBalance /
              (totalSupplyRaw! / 10n ** BigInt(protocolTokenMetadata.decimals))

        return {
          ...token,
          type: TokenType.Underlying,
          underlyingRateRaw,
        }
      },
    )

    return underlyingRates
  }
}
