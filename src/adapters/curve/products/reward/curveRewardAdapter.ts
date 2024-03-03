import { getAddress } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { TransferEvent } from '../../../../contracts/Erc20'
import { Chain } from '../../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { IMetadataBuilder } from '../../../../core/decorators/cacheToFile'
import {
  ResolveUnderlyingMovements,
  ResolveUnderlyingPositions,
} from '../../../../core/decorators/resolveUnderlyingPositions'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  ProtocolPosition,
  TokenType,
  GetEventsInput,
  MovementsByBlock,
  AssetType,
  Underlying,
} from '../../../../types/adapter'
import { GaugeType } from '../../common/getPoolData'
import {
  CrvMinter__factory,
  GaugeN__factory,
  GaugeSingle__factory,
} from '../../contracts'
import { CurveStakingAdapter } from '../staking/curveStakingAdapter'

const CurveTokenAddresses = {
  [Chain.Ethereum]: getAddress('0xd533a949740bb3306d119cc777fa900ba034cd52'),
  [Chain.Optimism]: getAddress('0x0994206dfe8de6ec6920ff4d779b0d950605fb53'),
  [Chain.Arbitrum]: getAddress('0x11cdb42b0eb46d95f990bedd4695a6e3fa034978'),
  [Chain.Fantom]: getAddress('0x1e4f97b9f9f913c46f1632781732927b9019c68b'),
  [Chain.Polygon]: getAddress('0x172370d5cd63279efa6d502dab29171933a610af'),
}

const CRV_TOKEN = {
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
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  minterAddress() {
    if (this.chainId === Chain.Ethereum) {
      return '0xd061D61a4d941c39E5453435B6345Dc261C2fcE0'
    } else {
      return '0xabc000d88f23bb45525e447528dbf656a9d55bf5'
    }
  }

  @ResolveUnderlyingPositions
  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const result: ProtocolPosition[] = []

    const promises = protocolTokenAddresses!.map(
      async (protocolTokenAddress) => {
        const gauge = await this.fetchGauge(protocolTokenAddress)

        const gaugeType = gauge.protocolToken.guageType

        const protocolToken = {
          ...gauge.protocolToken,
          type: TokenType.Protocol,
        }

        switch (gaugeType) {
          case GaugeType.SINGLE: {
            const contract = GaugeSingle__factory.connect(
              gauge.protocolToken.address,
              this.provider,
            )

            const balanceRaw = await contract.claimable_tokens.staticCall(
              userAddress,
              { blockTag: blockNumber },
            )

            result.push({
              ...protocolToken,
              type: TokenType.Reward,
              balanceRaw,
              tokens: [
                {
                  ...CRV_TOKEN,
                  address:
                    CurveTokenAddresses[
                      this.chainId as keyof typeof CurveTokenAddresses
                    ],
                  balanceRaw,
                  type: TokenType.UnderlyingClaimable,
                },
              ],
            })

            // Connect to type1 gauge contract
            break
          }

          case GaugeType.DOUBLE:
            // Connect to type2 gauge contract
            break
          case GaugeType.GAUGE_V4:
            // Connect to type3 gauge contract
            break
          case GaugeType.N_GAUGE: {
            const rewards: Underlying[] = []

            const contract = GaugeN__factory.connect(
              gauge.protocolToken.address,
              this.provider,
            )

            const balanceRaw = await contract.claimable_tokens.staticCall(
              userAddress,
              { blockTag: blockNumber },
            )

            if (balanceRaw !== 0n) {
              rewards.push({
                ...CRV_TOKEN,
                address:
                  CurveTokenAddresses[
                    this.chainId as keyof typeof CurveTokenAddresses
                  ],
                balanceRaw,
                type: TokenType.UnderlyingClaimable,
              })
            }

            await Promise.all(
              Array.from({ length: 4 }).map(async (_, i) => {
                const address = await contract.reward_tokens(i, {
                  blockTag: blockNumber,
                })
                if (address == ZERO_ADDRESS) return
                const balanceRaw = await contract.claimable_reward(
                  userAddress,
                  address,
                  { blockTag: blockNumber },
                )

                rewards.push({
                  ...(await getTokenMetadata(
                    address,
                    this.chainId,
                    this.provider,
                  )),
                  balanceRaw,
                  type: TokenType.UnderlyingClaimable,
                })
              }),
            )

            if (rewards.length > 0) {
              result.push({
                ...protocolToken,
                type: TokenType.Reward,
                balanceRaw,
                tokens: rewards,
              })
            }

            break
          }

          default:
            break
        }

        return
      },
    )

    await Promise.all(promises)

    return result
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [] // cant deposit rewards can only withdraw e.g. claimRewards()
  }

  @ResolveUnderlyingMovements
  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const crvMinter = CrvMinter__factory.connect(
      this.minterAddress(),
      this.provider,
    )

    const startBalance = await crvMinter.minted(
      userAddress,
      protocolTokenAddress,
      { blockTag: fromBlock },
    )
    const endBalance = await crvMinter.minted(
      userAddress,
      protocolTokenAddress,
      { blockTag: toBlock },
    )

    const withdrawn = endBalance - startBalance

    const protocolToken = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )

    const gauge = await this.fetchGauge(protocolTokenAddress)
    const extraRewardTokens: MovementsByBlock[] = []
    if (gauge.protocolToken.guageType === GaugeType.N_GAUGE) {
      const contract = GaugeN__factory.connect(
        gauge.protocolToken.address,
        this.provider,
      )

      await Promise.all(
        Array.from({ length: 4 }).map(async (_, i) => {
          const address = await contract.reward_tokens(i)
          if (address == ZERO_ADDRESS) return

          const claimed = await Erc20__factory.connect(address, this.provider)
          const filter = claimed.filters.Transfer(
            protocolTokenAddress,
            userAddress,
          )

          const eventResults = await claimed.queryFilter<TransferEvent.Event>(
            filter,
            fromBlock,
            toBlock,
          )

          eventResults.forEach(async (transferEvent) => {
            const tokenMetadata = await getTokenMetadata(
              address,
              this.chainId,
              this.provider,
            )

            const {
              blockNumber,
              args: { value: protocolTokenMovementValueRaw },
              transactionHash,
            } = transferEvent

            extraRewardTokens.push({
              transactionHash,
              protocolToken,
              tokens: [
                {
                  ...tokenMetadata,
                  balanceRaw: protocolTokenMovementValueRaw,
                  type: TokenType.Underlying,
                },
              ],
              blockNumber: blockNumber,
            })
          })

          return
        }),
      )
    }

    return [
      {
        transactionHash: '0x',
        protocolToken,
        tokens: [
          {
            ...CRV_TOKEN,
            address:
              CurveTokenAddresses[
                this.chainId as keyof typeof CurveTokenAddresses
              ],
            balanceRaw: withdrawn,
            type: TokenType.Underlying,
          },
        ],
        blockNumber: toBlock,
      },
      ...extraRewardTokens,
    ]
  }
}
