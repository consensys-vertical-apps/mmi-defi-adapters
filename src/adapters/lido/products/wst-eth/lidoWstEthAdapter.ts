import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  GetProfitsInput,
  GetApyInput,
  GetAprInput,
  GetClaimableRewardsInput,
  GetConversionRateInput,
  ProtocolRewardPosition,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProfitsWithRange,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { WstEthToken__factory } from '../../contracts'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'

export type LidoWstEthMetadata = {
  contractToken: Erc20Metadata
  underlyingToken: Erc20Metadata
}

export class LidoWstEthAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'wst-eth'
  protocolId: Protocol
  chainId: Chain

  stEthAdapter: IProtocolAdapter

  private provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.stEthAdapter = adaptersController.fetchAdapter(
      chainId,
      protocolId,
      'st-eth',
    )
  }

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Lido wstEth',
      description: 'Lido defi adapter for wstEth',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'wst-eth-token' })
  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    }

    const contractAddress = contractAddresses[this.chainId]!

    const wstEthContract = WstEthToken__factory.connect(
      contractAddress,
      this.provider,
    )
    const stEthContractAddress = await wstEthContract.stETH()

    const contractToken = await getTokenMetadata(
      contractAddress,
      this.chainId,
      this.provider,
    )
    const underlyingToken = await getTokenMetadata(
      stEthContractAddress,
      this.chainId,
      this.provider,
    )

    const metadataObject: LidoWstEthMetadata = {
      contractToken,
      underlyingToken,
    }

    return metadataObject
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [(await this.buildMetadata()).contractToken]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { contractToken, underlyingToken } = await this.buildMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      contractToken.address,
      this.provider,
    )

    const wstEthBalance = await wstEthContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    const stEthBalance = await wstEthContract.getStETHByWstETH(wstEthBalance, {
      blockTag: blockNumber,
    })

    const stEthTokenUnderlyingRate =
      await this.stEthAdapter.getProtocolTokenToUnderlyingTokenRate({
        protocolTokenAddress: underlyingToken.address,
        blockNumber,
      })

    const tokens = [
      {
        ...contractToken,
        type: TokenType.Protocol,
        balanceRaw: wstEthBalance,
        tokens: [
          {
            ...underlyingToken,
            type: TokenType.Underlying,
            balanceRaw: stEthBalance,
            tokens: stEthTokenUnderlyingRate.tokens?.map((underlying) => {
              return {
                address: underlying.address,
                name: underlying.name,
                symbol: underlying.symbol,
                decimals: underlying.decimals,
                type: TokenType.Underlying,
                balanceRaw:
                  stEthBalance *
                  BigInt(
                    Number(underlying.underlyingRateRaw) /
                      10 ** contractToken.decimals,
                  ),
              }
            }),
          },
        ],
      },
    ]

    return tokens
  }

  /**
   * Update me.
   * Add logic to get userAddress claimable rewards per position
   */
  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get user's withdrawals per position by block range
   */
  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get user's deposits per position by block range
   */
  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get user's claimed rewards per position by block range
   */
  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to calculate the underlying token rate of 1 protocol token
   */
  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    const { contractToken, underlyingToken } = await this.buildMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      contractToken.address,
      this.provider,
    )

    const pricePerShareRaw = await wstEthContract.stEthPerToken()

    return {
      ...contractToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw: pricePerShareRaw,
        },
      ],
    }
  }

  /**
   * Update me.
   * Add logic to calculate the users profits
   */
  async getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }
  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }
}
