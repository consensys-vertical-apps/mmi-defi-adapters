import { AbiCoder, getAddress, keccak256 } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
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
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { TokenType } from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { PositionManager__factory, StateView__factory } from '../../contracts'
import { getPosition } from './uniswapV4-helper'

// Uniswap V4 contract addresses from https://docs.uniswap.org/contracts/v4/deployments

const contractAddresses: Partial<
  Record<Chain, { positionManager: string; stateView: string }>
> = {
  [Chain.Ethereum]: {
    positionManager: getAddress('0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e'),
    stateView: getAddress('0x7ffe42c4a5deea5b0fec41c94c136cf115597227'),
  },
  [Chain.Optimism]: {
    positionManager: getAddress('0x3c3ea4b57a46241e54610e5f022e5c45859a1017'),
    stateView: getAddress('0xc18a3169788f4f75a170290584eca6395c75ecdb'),
  },
  [Chain.Base]: {
    positionManager: getAddress('0x7c5f5a4bbd8fd63184577525326123b519429bdc'),
    stateView: getAddress('0xa3c0c9b65bad0b08107aa264b0f3db444b867a71'),
  },
  [Chain.Arbitrum]: {
    positionManager: getAddress('0xd88f38f930b7952f2db2432cb002e7abbf3dd869'),
    stateView: getAddress('0x76fd297e2d437cd7f76d50f01afe6160f86e9990'),
  },
  [Chain.Polygon]: {
    positionManager: getAddress('0x1ec2ebf4f37e7363fdfe3551602425af0b3ceef9'),
    stateView: getAddress('0x5ea1bd7974c8a611cbab0bdcafcb1d9cc9b3ba5a'),
  },
}

export class UniswapV4PoolAdapter implements IProtocolAdapter {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

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
      name: 'UniswapV4',
      description: 'UniswapV4 defi adapter',
      siteUrl: 'https://uniswap.org/',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    return [
      {
        address: contractAddresses[this.chainId]!.positionManager,
        name: 'Uniswap V4 Positions NFT-V1',
        symbol: 'UNI-V4-POS',
        decimals: 0,
        underlyingTokens: [],
      },
    ]
  }

  async getPositions({
    userAddress,
    blockNumber,
    tokenIds,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    if (!tokenIds) {
      return []
    }

    const positionManagerContract = PositionManager__factory.connect(
      contractAddresses[this.chainId]!.positionManager,
      this.provider,
    )

    const stateViewContract = StateView__factory.connect(
      contractAddresses[this.chainId]!.stateView,
      this.provider,
    )

    return filterMapAsync(tokenIds, async (tokenId) => {
      // Use the helper function to calculate position token amounts
      const result = await getPosition(
        Number(tokenId),
        positionManagerContract,
        stateViewContract,
        this.helpers,
        blockNumber,
      )

      if (!result) {
        return undefined
      }

      // Get token metadata
      const [token0Metadata, token1Metadata] = await Promise.all([
        this.helpers.getTokenMetadata(result.token0.address),
        this.helpers.getTokenMetadata(result.token1.address),
      ])

      const nftName = this.protocolTokenName(
        token0Metadata.symbol,
        token1Metadata.symbol,
        tokenId.toString(),
      )

      return {
        address: contractAddresses[this.chainId]!.positionManager,
        tokenId: tokenId.toString(),
        name: nftName,
        symbol: nftName,
        decimals: 1,
        balanceRaw: 1n,
        type: TokenType.Protocol,
        tokens: [
          this.createUnderlyingToken(
            result.token0.address,
            token0Metadata,
            BigInt(result.token0.rawBalance),
            TokenType.UnderlyingClaimable,
          ),
          this.createUnderlyingToken(
            result.token1.address,
            token1Metadata,
            BigInt(result.token1.rawBalance),
            TokenType.UnderlyingClaimable,
          ),
        ],
      }
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private protocolTokenName(
    token0Symbol: string,
    token1Symbol: string,
    tokenId: string,
  ): string {
    return `${token0Symbol}/${token1Symbol} #${tokenId}`
  }

  private createUnderlyingToken(
    tokenAddress: string,
    tokenMetadata: Erc20Metadata,
    amount: bigint,
    type: 'underlying' | 'underlying-claimable',
  ): Underlying {
    return {
      address: getAddress(tokenAddress),
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      decimals: tokenMetadata.decimals,
      balanceRaw: amount,
      type,
    }
  }
}
