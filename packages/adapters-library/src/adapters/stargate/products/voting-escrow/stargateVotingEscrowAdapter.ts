import { getAddress } from 'ethers'
import { VotingEscrow } from '../../../../core/adapters/votingEscrow'
import {
  AssetType,
  GetPositionsInput,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { FeeDistributor__factory, VotingEscrow__factory } from '../../contracts'

export class StargateVotingEscrowAdapter extends VotingEscrow {
  productId = 'voting-escrow'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
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
      productId: this.productId,
    }
  }

  addresses = {
    veToken: getAddress('0x0e42acBD23FAee03249DAFF896b78d7e79fBD58E'),
    underlyingToken: getAddress('0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6'),
    rewardToken: getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
    feeDistributor: getAddress('0xAF667811A7eDcD5B0066CD4cA0da51637DB76D09'),
  }

  async getRewardBalance({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<bigint> {
    const contract = FeeDistributor__factory.connect(
      this.addresses.feeDistributor,
      this.provider,
    )

    return contract.claimToken.staticCall(
      userAddress,
      this.addresses.rewardToken,
      { blockTag: blockNumber },
    )
  }

  async getLockedDetails({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<{ amount: bigint; end: bigint }> {
    const votingEscrow = VotingEscrow__factory.connect(
      this.addresses.veToken,
      this.provider,
    )

    const [amount, end] = await votingEscrow.locked(userAddress, {
      blockTag: blockNumber,
    })

    return { amount, end }
  }
}
