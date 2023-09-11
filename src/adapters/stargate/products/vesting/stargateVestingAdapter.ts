import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { Protocol } from '../../..'
import { StargateVotingEscrow__factory } from '../../../../contracts'
import { Chain } from '../../../../core/constants/chains'
import {
  Erc20Metadata,
  getThinTokenMetadata,
} from '../../../../core/utils/getTokenMetadata'
import {
  IMetadataBuilder,
  fetchMetadata,
  writeMetadataToFile,
} from '../../../../core/utils/metadata'
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

type StargateVestingMetadata = {
  contractToken: Erc20Metadata
  underlyingToken: Erc20Metadata
}

export class StargateVestingAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  protocolId: Protocol
  chainId: Chain

  private provider: ethers.providers.StaticJsonRpcProvider

  constructor({ provider, chainId, protocolId }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
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
    return [(await this.fetchMetadata()).contractToken]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    const {
      contractToken: contractTokenMetadata,
      underlyingToken: underlyingTokenMetadata,
    } = await this.fetchMetadata()

    const votingEscrowContract = StargateVotingEscrow__factory.connect(
      contractTokenMetadata.address,
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

    await writeMetadataToFile({
      protocolId: this.protocolId,
      product: 'vesting',
      chainId: this.chainId,
      fileName: this.getMetadataFileName(),
      metadataObject,
    })
  }

  private async fetchMetadata(): Promise<StargateVestingMetadata> {
    return fetchMetadata({
      productDir: __dirname,
      fileName: this.getMetadataFileName(),
      chainId: this.chainId,
    })
  }

  private getMetadataFileName(): string {
    return 'vesting-token'
  }
}
