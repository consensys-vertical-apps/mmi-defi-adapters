import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { Protocol } from '../../..'
import { StargateVotingEscrow__factory } from '../../../../contracts'
import { Chain } from '../../../../core/constants/chains'
import { Erc20Metadata } from '../../../../core/utils/getTokenMetadata'
import {
  GetAprInput,
  GetApyInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  IProtocolAdapter,
  MovementsByBlock,
  PositionType,
  ProfitsTokensWithRange,
  ProtocolAdapterParams,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  TokenType,
} from '../../../../types/adapter'
import { StargateVestingMetadata } from '../../buildMetadata'
import { fetchStargateVestingMetadata } from '../../stargateMetadataFetcher'

export class StargateVestingAdapter implements IProtocolAdapter {
  private metadata: StargateVestingMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain
  private protocolTokens: Erc20Metadata[]

  constructor({ provider, chainId }: ProtocolAdapterParams) {
    this.metadata = fetchStargateVestingMetadata(chainId)
    this.provider = provider
    this.chainId = chainId
    this.protocolTokens = [this.metadata.contractToken]
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.Stargate,
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
    return this.protocolTokens
  }

  async getWithdrawals(): Promise<MovementsByBlock[]> {
    // TODO
    return []
  }
  async getOneDayProfit(): Promise<ProfitsTokensWithRange> {
    // TODO
    return {} as ProfitsTokensWithRange
  }

  async getDeposits(): Promise<MovementsByBlock[]> {
    // TODO
    return []
  }

  async getClaimedRewards(): Promise<MovementsByBlock[]> {
    // TODO
    return []
  }

  async getPricePerShare(): Promise<ProtocolPricePerShareToken> {
    // TODO
    return {} as ProtocolPricePerShareToken
  }

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
    // TODO
    return {} as ProtocolAprToken
  }

  async getApy(_input: GetApyInput): Promise<ProtocolApyToken> {
    // TODO
    return {} as ProtocolApyToken
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    const {
      contractToken: contractTokenMetadata,
      underlyingToken: underlyingTokenMetadata,
    } = this.metadata

    const votingEscrowContract = this.stargateVotingEscrowContract(
      contractTokenMetadata.address,
    )

    const { amount: lockedAmount } = await votingEscrowContract.locked(
      userAddress,
      {
        blockTag: blockNumber,
      },
    )

    const userBalance = await votingEscrowContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    const tokens = [
      {
        ...contractTokenMetadata,
        type: TokenType.Protocol,
        balanceRaw: BigInt(userBalance.toString()),
        balance: formatUnits(userBalance, contractTokenMetadata.decimals),
        tokens: [
          {
            ...underlyingTokenMetadata,
            type: TokenType.Underlying,
            balanceRaw: BigInt(lockedAmount.toString()),
            balance: formatUnits(
              lockedAmount,
              underlyingTokenMetadata.decimals,
            ),
          },
        ],
      },
    ]

    return tokens
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]> {
    // TODO
    return []
  }

  private stargateVotingEscrowContract(address: string) {
    return StargateVotingEscrow__factory.connect(address, this.provider)
  }
}
