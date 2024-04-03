import { getAddress } from 'ethers'
import { CurveVotingEscrow } from '../../../../scripts/templates/curveVotingEscrow'

export class CurveVotingEscrowAdapter extends CurveVotingEscrow {
  addresses = {
    veToken: getAddress('0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2'),
    underlyingToken: getAddress('0xD533a949740bb3306d119CC777fa900bA034cd52'),
    rewardToken: getAddress('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'),
    feeDistributor: getAddress('0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc'),
  }
}
