import type { ethers } from 'ethers'
import { formatUnits } from 'ethers'
import { Chain } from '../../../../core/constants/chains.js'
import { Adapter } from '../../../../core/decorators/adapter.js'
import { CacheToFile } from '../../../../core/decorators/cacheToFile.js'
import {
  Erc20Metadata,
  getThinTokenMetadata,
} from '../../../../core/utils/getTokenMetadata.js'
import { IMetadataBuilder } from '../../../../core/utils/metadata.js'
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
} from '../../../../types/adapter.js'
import { Protocol } from '../../../index.js'
import { StargateVotingEscrow__factory } from '../../contracts/index.js'

type StargateVestingMetadata = {
  contractToken: Erc20Metadata
  underlyingToken: Erc20Metadata
}

@Adapter
export class StargateVestingAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  product!: string
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
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    const { contractToken, underlyingToken } = await this.buildMetadata()

    const votingEscrowContract = StargateVotingEscrow__factory.connect(
      contractToken.address,
      this.provider,
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
        ...contractToken,
        type: TokenType.Protocol,
        balanceRaw: BigInt(userBalance.toString()),
        balance: formatUnits(userBalance, contractToken.decimals),
        tokens: [
          {
            ...underlyingToken,
            type: TokenType.Underlying,
            balanceRaw: BigInt(lockedAmount.toString()),
            balance: formatUnits(lockedAmount, underlyingToken.decimals),
          },
        ],
      },
    ]

    return tokens
  }

  async getPricePerShare(): Promise<ProtocolPricePerShareToken> {
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
  ): Promise<ProtocolTotalValueLockedToken[]> {
    throw new Error('Not Implemented')
  }

  async getOneDayProfit(): Promise<ProfitsTokensWithRange> {
    throw new Error('Not Implemented')
  }

  async getApy(_input: GetApyInput): Promise<ProtocolApyToken> {
    throw new Error('Not Implemented')
  }

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
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
      underlyingToken,
    }

    return metadataObject
  }
}
