import { VotingEscrow } from '../../../../core/adapters/votingEscrow'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import {
  FeeDistributor__factory,
  VotingEscrow__factory,
} from '../../../stargate/contracts'

export class BalancerV2VestingAdapter extends VotingEscrow {
  productId = 'vesting'

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
    userEvent: {
      topic0:
        '0x4566dfc29f6f11d13a418c26a02bef7c28bae749d4de47e4e6a7cddea6730d59',
      userAddressIndex: 1,
    },
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'BalancerV2',
      description: 'BalancerV2 defi adapter',
      siteUrl: '',
      iconUrl: '',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  addresses = {
    veToken: '0xC128a9954e6c874eA3d62ce62B468bA073093F25',
    underlyingToken: '0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56',
    rewardToken: '0xa13a9247ea42d743238089903570127dda72fe44',
    feeDistributor: '0xD3cf852898b21fc233251427c2DC93d3d604F3BB',
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
