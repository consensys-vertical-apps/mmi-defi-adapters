import { ethers } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { Chain } from '../../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
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

export type LidoStEthMetadata = {
  contractToken: Erc20Metadata
  underlyingToken: Erc20Metadata
}

export class LidoStEthAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'st-eth'
  protocolId: Protocol
  chainId: Chain

  private provider: ethers.JsonRpcProvider

  constructor({ provider, chainId, protocolId }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Lido stEth',
      description: 'Lido defi adapter for stEth',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'st-eth-token' })
  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    }

    const contractToken = await getTokenMetadata(
      contractAddresses[this.chainId]!,
      this.chainId,
    )
    const underlyingToken = await getTokenMetadata(ZERO_ADDRESS, this.chainId)

    const metadataObject: LidoStEthMetadata = {
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

    const stEthContract = Erc20__factory.connect(
      contractToken.address,
      this.provider,
    )

    const stEthBalance = await stEthContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    const tokens = [
      {
        ...contractToken,
        type: TokenType.Protocol,
        balanceRaw: stEthBalance,
        tokens: [
          {
            ...underlyingToken,
            type: TokenType.Underlying,
            balanceRaw: stEthBalance,
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

  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    const { contractToken, underlyingToken } = await this.buildMetadata()

    // Always pegged one to one to underlying
    const pricePerShareRaw = BigInt(10 ** contractToken.decimals)

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
