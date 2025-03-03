import { getAddress } from 'ethers'
import type { AdaptersController } from '../../../../core/adaptersController.js'
import { Chain } from '../../../../core/constants/chains.js'
import { NotImplementedError } from '../../../../core/errors/errors.js'
import type { Helpers } from '../../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import { filterMapAsync } from '../../../../core/utils/filters.js'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  type GetPositionsInput,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  TokenType,
  type Underlying,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../../types/adapter.js'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import type { Protocol } from '../../../protocols.js'
import { PositionManager__factory } from '../../contracts/index.js'

// Parameter needed for static call request
// Set the date in the future to ensure the static call request doesn't trigger smart contract validation
const deadline = Math.floor(Date.now() - 1000) + 60 * 10

const positionManagerCommonAddress = getAddress(
  '0x5D3D9E20ad27dd61182505230D1bD075bd249E4B',
)

const contractAddresses: Partial<Record<Chain, { positionManager: string }>> = {
  [Chain.Linea]: {
    positionManager: positionManagerCommonAddress,
  },
}

export const maxUint128 = BigInt(2) ** BigInt(128) - BigInt(1)

export class LynexAlgebraAdapter implements IProtocolAdapter {
  productId = 'algebra'
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
      name: 'Lynex Algebra',
      description: 'Lynex Algebra defi adapter',
      siteUrl: 'https://app.lynex.fi/',
      iconUrl: 'https://app.lynex.fi/logo.png',
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
    tokenIds: tokenIdsRaw,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const positionsManagerContract = PositionManager__factory.connect(
      contractAddresses[this.chainId]!.positionManager,
      this.provider,
    )

    const tokenIds =
      tokenIdsRaw?.map((tokenId) => BigInt(tokenId)) ??
      (await this.getTokenIds(userAddress, blockNumber))

    return filterMapAsync(tokenIds, async (tokenId) => {
      try {
        const position = await positionsManagerContract.positions(tokenId, {
          blockTag: blockNumber,
        })

        if (position.liquidity === 0n) {
          return undefined
        }

        const [
          { amount0, amount1 },
          { amount0: amount0Fee, amount1: amount1Fee },
          token0Metadata,
          token1Metadata,
        ] = await Promise.all([
          positionsManagerContract.decreaseLiquidity.staticCall(
            {
              tokenId: tokenId,
              liquidity: position.liquidity,
              amount0Min: 0n,
              amount1Min: 0n,
              deadline,
            },
            { from: userAddress, blockTag: blockNumber },
          ),
          positionsManagerContract.collect.staticCall(
            {
              tokenId,
              recipient: userAddress,
              amount0Max: maxUint128,
              amount1Max: maxUint128,
            },
            { from: userAddress, blockTag: blockNumber },
          ),
          getTokenMetadata(position.token0, this.chainId, this.provider),
          getTokenMetadata(position.token1, this.chainId, this.provider),
        ])

        const nftName = this.protocolTokenName(
          token0Metadata.symbol,
          token1Metadata.symbol,
        )

        return {
          address: contractAddresses[this.chainId]!.positionManager,
          tokenId: tokenId.toString(),
          name: nftName,
          symbol: nftName,
          decimals: 18,
          balanceRaw: position.liquidity,
          type: TokenType.Protocol,
          tokens: [
            this.createUnderlyingToken(
              position.token0,
              token0Metadata,
              amount0,
              TokenType.Underlying,
            ),
            this.createUnderlyingToken(
              position.token0,
              token0Metadata,
              amount0Fee,
              TokenType.UnderlyingClaimable,
            ),
            this.createUnderlyingToken(
              position.token1,
              token1Metadata,
              amount1,
              TokenType.Underlying,
            ),
            this.createUnderlyingToken(
              position.token1,
              token1Metadata,
              amount1Fee,
              TokenType.UnderlyingClaimable,
            ),
          ],
        }
      } catch (error) {
        // if token position isnt minted then method throws
        return undefined
      }
    })
  }

  private async getTokenIds(
    userAddress: string,
    blockNumber: number | undefined,
  ): Promise<bigint[]> {
    const positionsManagerContract = PositionManager__factory.connect(
      contractAddresses[this.chainId]!.positionManager,
      this.provider,
    )
    const balanceOf = await positionsManagerContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    return await Promise.all(
      [...Array(Number(balanceOf)).keys()].map(async (index) => {
        return positionsManagerContract.tokenOfOwnerByIndex(
          userAddress,
          index,
          {
            blockTag: blockNumber,
          },
        )
      }),
    )
  }

  private protocolTokenName(token0Symbol: string, token1Symbol: string) {
    return `${token0Symbol} / ${token1Symbol}`
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
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
}
