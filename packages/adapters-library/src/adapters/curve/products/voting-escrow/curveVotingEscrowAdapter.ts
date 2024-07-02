import { getAddress } from 'ethers'
import { VotingEscrow } from '../../../../core/adapters/votingEscrow'
import {
  AssetType,
  GetPositionsInput,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { FeeDistributor__factory, VotingEscrow__factory } from '../../contracts'

export class CurveVotingEscrowAdapter extends VotingEscrow {
  productId = 'voting-escrow'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Curve',
      description: 'Curve defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  addresses = {
    veToken: getAddress('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2'),
    underlyingToken: getAddress('0xD533a949740bb3306d119CC777fa900bA034cd52'),
    rewardToken: getAddress('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'),
    feeDistributor: getAddress('0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc'),
  }

  async getRewardBalance({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<bigint> {
    const feeDistributor = FeeDistributor__factory.connect(
      this.addresses.feeDistributor,
      this.provider,
    )

    return await feeDistributor['claim(address)'].staticCall(userAddress, {
      blockTag: blockNumber,
      from: userAddress,
    })
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
