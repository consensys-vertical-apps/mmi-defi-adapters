import { UniswapV2Pair__factory } from '../../../../contracts'
import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  GetPositionsInput,
  PositionType,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'

export class UniswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'UniswapV2',
      description: 'UniswapV2 pool adapter',
      siteUrl: 'https://v2.info.uniswap.org/home',
      iconUrl: 'https://cryptologos.cc/logos/uniswap-uni-logo.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const transferLogs = await this.provider.getAllTransferLogsToAddress(
      input.userAddress,
    )

    // Get all unique UniswapV2 pair addresses from the transfer logs
    const uniswapV2Addresses = await filterMapAsync(
      Array.from(new Set(transferLogs.map((log) => log.address))),
      async (address) => {
        const pairContract = UniswapV2Pair__factory.connect(
          address,
          this.provider,
        )
        try {
          const factory = await pairContract.factory()

          if (
            factory !==
            this.chainMetadataSettings()[this.chainId]!.factoryAddress
          ) {
            return undefined
          }

          return await getTokenMetadata(address, this.chainId, this.provider)
        } catch (error) {
          return undefined
        }
      },
    )

    const protocolTokenBalances = await this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: uniswapV2Addresses,
    })

    return await Promise.all(
      protocolTokenBalances.map(async (protocolTokenBalance) => {
        const underlyingRates = await this.unwrap({
          protocolTokenAddress: protocolTokenBalance.address,
          blockNumber: input.blockNumber,
        })

        return {
          ...protocolTokenBalance,
          tokens: underlyingRates.tokens!.map((token) => {
            return {
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              type: TokenType.Underlying,
              balanceRaw:
                (token.underlyingRateRaw! * protocolTokenBalance.balanceRaw) /
                10n ** BigInt(protocolTokenBalance.decimals),
            }
          }),
        }
      }),
    )
  }

  protected chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkPositionStrategy>
  > {
    return {
      [Chain.Ethereum]: {
        type: 'logs',
        factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      },
      [Chain.Optimism]: {
        type: 'factory',
        factoryAddress: '0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf',
      },
      [Chain.Bsc]: {
        type: 'factory',
        factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
      },
      [Chain.Polygon]: {
        type: 'factory',
        factoryAddress: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C',
      },
      [Chain.Base]: {
        type: 'factory',
        factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
      },
      [Chain.Arbitrum]: {
        type: 'factory',
        factoryAddress: '0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9',
      },
      [Chain.Avalanche]: {
        type: 'factory',
        factoryAddress: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C',
      },
    }
  }
}
