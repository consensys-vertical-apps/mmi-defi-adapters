import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { StargateVotingEscrow__factory } from '../../../../contracts'
import { Chain } from '../../../../core/constants/chains'
import { Protocol } from '../../../../core/constants/protocols'
import {
  IProtocolAdapter,
  ProtocolDetails,
  TradeEvent,
  GetPositionsInput,
  GetTotalValueLockedInput,
  PositionType,
  TokenType,
} from '../../../../types/adapter'
import {
  ProfitsTokensWithRange,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
} from '../../../../types/response'
import { StargateVestingMetadata } from '../../buildMetadata'

export class StargateVestingAdapter implements IProtocolAdapter {
  private metadata: StargateVestingMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain

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

  async getWithdrawals(): Promise<TradeEvent[]> {
    // TODO
    return []
  }
  async getOneDayProfit(): Promise<ProfitsTokensWithRange> {
    return {
      tokens: [],
      fromBlock: 0,
      toBlock: 0,
    }
  }

  async getDeposits(): Promise<TradeEvent[]> {
    // TODO
    return []
  }

  async getClaimedRewards(): Promise<TradeEvent[]> {
    // TODO
    return []
  }

  async getPricePerShare(): Promise<ProtocolPricePerShareToken[]> {
    // TODO
    return []
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
