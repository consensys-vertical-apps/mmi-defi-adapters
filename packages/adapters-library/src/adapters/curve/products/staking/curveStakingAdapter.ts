import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { Replacements } from '../../../../scripts/replacements'
import { RewardsAdapter } from '../../../../scripts/rewardAdapter'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  CurveStakingAdapterMetadata,
  GaugeType,
  queryCurveGauges,
} from '../../../curve/common/getPoolData'
import { Protocol } from '../../../protocols'

import { TransferEvent } from '../../../../contracts/Erc20'
import { Erc20__factory } from '../../../../contracts/factories/Erc20__factory'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  CrvMinter__factory,
  GaugeN__factory,
  GaugeSingle__factory,
} from '../../../curve/contracts'

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

export class CurveStakingAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false, // Looks like most the staking tokens actually have the events apart from 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A
    includeInUnwrap: true,
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Curve staking',
      description: 'Curve staking adapter',
      siteUrl: 'https://curve.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/crv.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return queryCurveGauges(this.chainId, this.provider)
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const [underlyingLpToken] =
      await this.getUnderlyingTokens(protocolTokenAddress)

    const protocolToken = await this.getProtocolToken(protocolTokenAddress)

    //// curve staking contracts dont have transfer events so use underlying lp token events instead
    const movements = await this.helpers.getErc20Movements({
      protocolToken: underlyingLpToken!,

      filter: {
        fromBlock,
        toBlock,
        from: userAddress,
        to: protocolTokenAddress,
      },
    })

    movements.forEach((movement) => {
      movement.protocolToken = protocolToken
    })

    return movements
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const [underlyingLpToken] =
      await this.getUnderlyingTokens(protocolTokenAddress)

    const protocolToken = await this.getProtocolToken(protocolTokenAddress)

    //// curve staking contracts dont have transfer events so use underlying lp token events instead
    const movements = await this.helpers.getErc20Movements({
      protocolToken: underlyingLpToken!,

      filter: {
        fromBlock,
        toBlock,
        from: protocolTokenAddress,
        to: userAddress,
      },
    })

    movements.forEach((movement) => {
      movement.protocolToken = protocolToken
    })

    return movements
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
    })
  }

  private async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }
  private async getUnderlyingTokens(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).underlyingTokens
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  async fetchGauge(
    protocolTokenAddress: string,
  ): Promise<CurveStakingAdapterMetadata[Key]> {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  async getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddress,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const gauge = await this.fetchGauge(protocolTokenAddress)

    const gaugeType = gauge.protocolToken.guageType

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

        return [
          {
            ...CRV_TOKEN,
            address:
              CurveTokenAddresses[
                this.chainId as keyof typeof CurveTokenAddresses
              ],
            balanceRaw,
            type: TokenType.UnderlyingClaimable,
          },
        ]
      }

      case GaugeType.DOUBLE:
        return []
      case GaugeType.GAUGE_V4:
        return []
      case GaugeType.N_GAUGE: {
        const rewards: UnderlyingReward[] = []

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
            if (address === ZERO_ADDRESS) return
            const balanceRaw = await contract.claimable_reward(
              userAddress,
              address,
              { blockTag: blockNumber },
            )

            rewards.push({
              ...(await getTokenMetadata(address, this.chainId, this.provider)),
              balanceRaw,
              type: TokenType.UnderlyingClaimable,
            })
          }),
        )

        return rewards
      }

      default:
        return []
    }
  }

  minterAddress() {
    if (this.chainId === Chain.Ethereum) {
      return '0xd061D61a4d941c39E5453435B6345Dc261C2fcE0'
    }
    return '0xabc000d88f23bb45525e447528dbf656a9d55bf5'
  }

  async getRewardWithdrawals({
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

    const protocolToken = await this.getProtocolToken(protocolTokenAddress)

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
          if (address === ZERO_ADDRESS) return

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

type Key = keyof CurveStakingAdapterMetadata
