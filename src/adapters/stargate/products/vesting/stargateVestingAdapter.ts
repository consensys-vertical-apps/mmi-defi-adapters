import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { StargateVotingEscrow__factory } from '../../../../contracts'
import { Chain } from '../../../../core/constants/chains'
import { Protocol } from '../../..'
import {
  IProtocolAdapter,
  ProtocolDetails,
  MovementsByBlock,
  GetPositionsInput,
  GetTotalValueLockedInput,
  PositionType,
  TokenType,
  ProfitsTokensWithRange,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  ProtocolAprToken,
  GetAprInput,
  ProtocolApyToken,
  GetApyInput,
} from '../../../../types/adapter'
import { StargateVestingMetadata } from '../../buildMetadata'
import { ERC20 } from '../../../../core/utils/getTokenMetadata'

export class StargateVestingAdapter implements IProtocolAdapter {
  private metadata: StargateVestingMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain
  private protocolTokens: ERC20[]

  constructor({
    metadata,
    provider,
    chainId,
  }: {
    metadata: StargateVestingMetadata
    provider: ethers.providers.StaticJsonRpcProvider
    chainId: Chain
  }) {
    this.metadata = metadata
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

  async getProtocolTokens(): Promise<ERC20[]> {
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
