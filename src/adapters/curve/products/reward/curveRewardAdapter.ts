import { IMetadataBuilder } from '../../../../core/decorators/cacheToFile'
import { filterMapAsync } from '../../../../core/utils/filters'
import {
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  ProtocolPosition,
  TokenType,
  GetEventsInput,
  MovementsByBlock,
} from '../../../../types/adapter'
import { CrvMinter__factory, StakingContract__factory } from '../../contracts'
import { CurveStakingAdapter } from '../staking/curveStakingAdapter'

const CRV_MINTER_ADDRESS = '0xd061D61a4d941c39E5453435B6345Dc261C2fcE0'

const CRV_TOKEN = {
  address: '0xd533a949740bb3306d119cc777fa900ba034cd52',
  name: 'Curve DAO Token',
  symbol: 'CRV',
  decimals: 18,
  iconUrl:
    'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/crv.svg',
}

export class CurveRewardAdapter
  extends CurveStakingAdapter
  implements IMetadataBuilder
{
  productId = 'reward'

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Curve reward',
      description: 'Curve reward adapter',
      siteUrl: 'https://curve.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/crv.svg',
      positionType: PositionType.Reward,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const stakingContracts = await this.getProtocolTokens()

    return await filterMapAsync(stakingContracts, async (protcolToken) => {
      const { address } = protcolToken

      const stakingContract = StakingContract__factory.connect(
        address,
        this.provider,
      )

      const balanceRaw = await stakingContract.claimable_tokens
        .staticCall(userAddress, { blockTag: blockNumber })
        .catch(() => 0n)

      if (balanceRaw == 0n) {
        return undefined
      }

      return {
        ...protcolToken,
        balanceRaw,
        type: TokenType.Reward,
        tokens: [
          {
            ...CRV_TOKEN,
            balanceRaw,
            type: TokenType.UnderlyingClaimable,
          },
        ],
      }
    })
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [] // cant deposit rewards can only withdraw e.g. claimRewards()
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const crvMiniter = CrvMinter__factory.connect(
      CRV_MINTER_ADDRESS,
      this.provider,
    )

    try {
      const startBalance = await crvMiniter.minted(
        userAddress,
        protocolTokenAddress,
        { blockTag: fromBlock },
      )
      const endBalance = await crvMiniter.minted(
        userAddress,
        protocolTokenAddress,
        { blockTag: toBlock },
      )

      const withdrawn = endBalance - startBalance

      const protocolToken = await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      )

      return [
        {
          protocolToken,
          underlyingTokensMovement: {
            [CRV_TOKEN.address]: {
              ...CRV_TOKEN,
              movementValueRaw: withdrawn,
              transactionHash: undefined,
            },
          },
          blockNumber: toBlock,
        },
      ]
    } catch (error) {
      return []
    }
  }
}
