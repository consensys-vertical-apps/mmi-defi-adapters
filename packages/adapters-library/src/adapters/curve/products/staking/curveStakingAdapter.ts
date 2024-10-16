import { ethers, getAddress } from 'ethers'
import type { TransferEvent } from '../../../../contracts/Erc20.js'
import { Erc20__factory } from '../../../../contracts/factories/Erc20__factory.js'
import type { AdaptersController } from '../../../../core/adaptersController.js'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS.js'
import { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import { filterMapAsync } from '../../../../core/utils/filters.js'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata.js'
import type { Helpers } from '../../../../scripts/helpers.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter.js'
import {
  type GetEventsInput,
  type GetPositionsInput,
  type GetRewardPositionsInput,
  type GetTotalValueLockedInput,
  type MovementsByBlock,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  type ProtocolTokenTvl,
  TokenType,
  type UnderlyingReward,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../../types/adapter.js'
import {
  CrvMinter__factory,
  GaugeN__factory,
  GaugeSingle__factory,
} from '../../../curve/contracts/index.js'
import type { Protocol } from '../../../protocols.js'
import { getCurvePoolData } from '../../common/getPoolData.js'

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

type AdditionalMetadata = {
  gaugeType: GaugeType
}

enum GaugeType {
  SINGLE = 'single',
  DOUBLE = 'double',
  N_GAUGE = 'n-gauge',
  GAUGE_V4 = 'gauge-v4',
  CHILD = 'child-chain',
  REWARDS_ONLY = 'rewards-only',
}

export class CurveStakingAdapter implements IProtocolAdapter {
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

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const pools = await getCurvePoolData(this.chainId, this.productId)

    return await filterMapAsync(pools, async (pool) => {
      if (!pool.gaugeAddress) {
        return
      }

      const protocolToken = await getTokenMetadata(
        pool.lpTokenAddress,
        this.chainId,
        this.provider,
      )

      return {
        ...protocolToken,
        address: getAddress(pool.gaugeAddress),
        underlyingTokens: [protocolToken],
        gaugeType: await this.resolveGaugeType(pool.gaugeAddress),
      }
    })
  }

  private async resolveGaugeType(gaugeAddress: string): Promise<GaugeType> {
    let bytecode = await this.provider.getCode(gaugeAddress)
    const minimalProxyMatch =
      /0x363d3d373d3d3d363d73(.*)5af43d82803e903d91602b57fd5bf3/.exec(bytecode)
    if (minimalProxyMatch)
      bytecode = await this.provider.getCode(`0x${minimalProxyMatch[1]}`)

    const doubleGaugeMethod = ethers.id('rewarded_token()').slice(2, 10)
    const nGaugeMethod = ethers.id('reward_tokens(uint256)').slice(2, 10)
    const gaugeV4Method = ethers
      .id('claimable_reward_write(address,address)')
      .slice(2, 10)

    if (bytecode.includes(gaugeV4Method)) return GaugeType.GAUGE_V4
    if (bytecode.includes(nGaugeMethod)) return GaugeType.N_GAUGE
    if (bytecode.includes(doubleGaugeMethod)) return GaugeType.DOUBLE
    return GaugeType.SINGLE
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
    const {
      underlyingTokens: [underlyingToken],
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    //// curve staking contracts dont have transfer events so use underlying lp token events instead
    const movements = await this.helpers.getErc20Movements({
      protocolToken: underlyingToken!,
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
    const {
      underlyingTokens: [underlyingToken],
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    //// curve staking contracts dont have transfer events so use underlying lp token events instead
    const movements = await this.helpers.getErc20Movements({
      protocolToken: underlyingToken!,

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
    const { underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return this.helpers.unwrapOneToOne({
      protocolToken,
      underlyingTokens,
    })
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddress,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { gaugeType, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    switch (gaugeType) {
      case GaugeType.SINGLE: {
        const contract = GaugeSingle__factory.connect(
          protocolToken.address,
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
          protocolToken.address,
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

    const { underlyingTokens, gaugeType, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const extraRewardTokens: MovementsByBlock[] = []
    if (gaugeType === GaugeType.N_GAUGE) {
      const contract = GaugeN__factory.connect(
        protocolToken.address,
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
