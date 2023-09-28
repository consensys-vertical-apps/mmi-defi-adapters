import type { ethers } from 'ethers'
import { formatUnits } from 'ethers'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { getThinTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  GetAprInput,
  GetApyInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProfitsWithRange,
  ProtocolAdapterParams,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolDetails,
  ProtocolTokenUnderlyingRate,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  ProtocolRewardPosition,
  GetClaimableRewardsInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { StargateVotingEscrow__factory } from '../../contracts'

type StargateVestingMetadata = {
  contractToken: Erc20Metadata
  underlyingToken: Erc20Metadata & { iconUrl: string }
}

export class StargateVestingAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  product = 'vesting'
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
      name: 'Stargate',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [(await this.buildMetadata()).contractToken]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { contractToken, underlyingToken } = await this.buildMetadata()

    const votingEscrowContract = StargateVotingEscrow__factory.connect(
      contractToken.address,
      this.provider,
    )

    const [{ amount: lockedAmount }, userBalance] = await Promise.all([
      votingEscrowContract.locked(userAddress, {
        blockTag: blockNumber,
      }),
      votingEscrowContract.balanceOf(userAddress, {
        blockTag: blockNumber,
      }),
    ])

    if (!userBalance && !lockedAmount) {
      return []
    }

    const tokens = [
      {
        ...contractToken,
        type: TokenType.Protocol,
        balanceRaw: userBalance,
        balance: formatUnits(userBalance, contractToken.decimals),
        tokens: [
          {
            ...underlyingToken,
            type: TokenType.Underlying,
            balanceRaw: lockedAmount,
            balance: formatUnits(lockedAmount, underlyingToken.decimals),
          },
        ],
      },
    ]

    return tokens
  }

  async getProtocolTokenToUnderlyingTokenRate(): Promise<ProtocolTokenUnderlyingRate> {
    throw new Error('Not Implemented')
  }

  async getWithdrawals(): Promise<MovementsByBlock[]> {
    throw new Error('Not Implemented')
  }

  async getDeposits(): Promise<MovementsByBlock[]> {
    throw new Error('Not Implemented')
  }

  async getClaimedRewards(): Promise<MovementsByBlock[]> {
    throw new Error('Not Implemented')
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new Error('Not Implemented')
  }

  async getProfits(): Promise<ProfitsWithRange> {
    throw new Error('Not Implemented')
  }

  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new Error('Not Implemented')
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new Error('Not Implemented')
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new Error('Not Implemented')
  }
  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new Error('Not Implemented')
  }

  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new Error('Not Implemented')
  }

  @CacheToFile({ fileKey: 'vesting-token' })
  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]: '0x0e42acBD23FAee03249DAFF896b78d7e79fBD58E',
      [Chain.Arbitrum]: '0xfBd849E6007f9BC3CC2D6Eb159c045B8dc660268',
    }

    const votingEscrowContract = StargateVotingEscrow__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )

    const underlyingTokenAddress = (
      await votingEscrowContract.token()
    ).toLowerCase()

    const contractToken = await getThinTokenMetadata(
      contractAddresses[this.chainId]!,
      this.chainId,
    )
    const underlyingToken = await getThinTokenMetadata(
      underlyingTokenAddress,
      this.chainId,
    )

    const metadataObject: StargateVestingMetadata = {
      contractToken,
      underlyingToken: {
        ...underlyingToken,
        iconUrl: buildTrustAssetIconUrl(this.chainId, underlyingToken.address),
      },
    }

    return metadataObject
  }
}
