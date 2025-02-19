import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { maxUint128 } from '../../../uniswap-v3/products/pool/uniswapV3PoolAdapter'
import { LiquidityManager__factory } from '../../contracts/factories'

const contractAddresses: Partial<Record<Chain, { liquidityManager: string }>> =
  {
    [Chain.Arbitrum]: {
      liquidityManager: getAddress(
        '0xAD1F11FBB288Cd13819cCB9397E59FAAB4Cdc16F',
      ),
    },
    [Chain.Linea]: {
      liquidityManager: getAddress(
        '0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c',
      ),
    },
    [Chain.Bsc]: {
      liquidityManager: getAddress(
        '0xBF55ef05412f1528DbD96ED9E7181f87d8C9F453',
      ),
    },
    [Chain.Base]: {
      liquidityManager: getAddress(
        '0x110dE362cc436D7f54210f96b8C7652C2617887D',
      ),
    },
  }

export class IZiSwapPoolAdapter implements IProtocolAdapter {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
  }

  adaptersController: AdaptersController

  provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'IZiSwap',
      description: 'IZiSwap defi adapter',
      siteUrl: 'https://izumi.finance',
      iconUrl: 'https://izumi.finance/assets/sidebar/logo.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getProtocolTokens(): Promise<ProtocolToken[]> {
    throw new NotImplementedError()
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const liquidityManagerContract = LiquidityManager__factory.connect(
      contractAddresses[this.chainId]!.liquidityManager,
      this.provider,
    )

    const balanceOf = await liquidityManagerContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    return filterMapAsync(
      [...Array(Number(balanceOf)).keys()],
      async (index) => {
        const tokenId = await liquidityManagerContract.tokenOfOwnerByIndex(
          userAddress,
          index,
          {
            blockTag: blockNumber,
          },
        )

        const liquidity = await liquidityManagerContract.liquidities(tokenId, {
          blockTag: blockNumber,
        })

        if (liquidity.liquidity === 0n) {
          return undefined
        }

        const poolMeta = await liquidityManagerContract.poolMetas(
          liquidity.poolId,
          {
            blockTag: blockNumber,
          },
        )

        const [
          { amountX, amountY },
          { amountX: amountXFee, amountY: amountYFee },
          tokenXMetadata,
          tokenYMetadata,
        ] = await Promise.all([
          liquidityManagerContract.decLiquidity.staticCall(
            tokenId,
            liquidity.liquidity,
            0n,
            0n,
            '0xffffffff',
            { from: userAddress, blockTag: blockNumber },
          ),
          liquidityManagerContract.collect.staticCall(
            userAddress,
            tokenId,
            maxUint128,
            maxUint128,
            { from: userAddress, blockTag: blockNumber },
          ),
          getTokenMetadata(poolMeta.tokenX, this.chainId, this.provider),
          getTokenMetadata(poolMeta.tokenY, this.chainId, this.provider),
        ])

        const nftName = this.protocolTokenName(
          tokenXMetadata.symbol,
          tokenYMetadata.symbol,
          poolMeta.fee,
        )

        return {
          address: contractAddresses[this.chainId]!.liquidityManager,
          tokenId: tokenId.toString(),
          name: nftName,
          symbol: nftName,
          decimals: 18,
          balanceRaw: liquidity.liquidity,
          type: TokenType.Protocol,
          tokens: [
            this.createUnderlyingToken(
              poolMeta.tokenX,
              tokenXMetadata,
              amountX,
              TokenType.Underlying,
            ),
            this.createUnderlyingToken(
              poolMeta.tokenX,
              tokenXMetadata,
              amountXFee,
              TokenType.UnderlyingClaimable,
            ),
            this.createUnderlyingToken(
              poolMeta.tokenY,
              tokenYMetadata,
              amountY,
              TokenType.Underlying,
            ),
            this.createUnderlyingToken(
              poolMeta.tokenY,
              tokenYMetadata,
              amountYFee,
              TokenType.UnderlyingClaimable,
            ),
          ],
        }
      },
    )
  }

  private protocolTokenName(
    token0Symbol: string,
    token1Symbol: string,
    fee: bigint,
  ) {
    return `${token0Symbol} / ${token1Symbol} - ${fee}`
  }

  private createUnderlyingToken(
    address: string,
    metadata: Erc20Metadata,
    balanceRaw: bigint,
    type: typeof TokenType.Underlying | typeof TokenType.UnderlyingClaimable,
  ): Underlying {
    return {
      address,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      balanceRaw,
      type,
    }
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
