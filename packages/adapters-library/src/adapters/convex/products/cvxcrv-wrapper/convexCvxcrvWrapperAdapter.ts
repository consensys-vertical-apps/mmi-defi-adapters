import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  MovementsByBlockReward,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { CvxcrvWrapper__factory } from '../../contracts'
import { RewardPaidEvent } from '../../contracts/CvxcrvWrapper'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

const CVXCRV_WRAPPER_ADDRESS = getAddress(
  '0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434',
)

export class ConvexCvxcrvWrapperAdapter implements IProtocolAdapter {
  productId = 'cvxcrv-wrapper'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: false,
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
      name: 'Convex',
      description: 'Convex adapter for CvxCrv staking',
      siteUrl: 'https://curve.convexfinance.com/stake',
      iconUrl: buildTrustAssetIconUrl(
        Chain.Ethereum,
        '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
      ),
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const cvxcrvContract = CvxcrvWrapper__factory.connect(
      CVXCRV_WRAPPER_ADDRESS,
      this.provider,
    )

    const [underlyingTokenAddress, rewardTokensLength] = await Promise.all([
      cvxcrvContract.cvxCrv(),
      cvxcrvContract.rewardLength(),
    ])

    const rewardTokens = Array.from(
      { length: Number(rewardTokensLength) },
      async (_, i) => {
        const rewardTokenAddress = await cvxcrvContract.rewards(i)

        return await this.helpers.getTokenMetadata(
          rewardTokenAddress.reward_token,
        )
      },
    )

    const [protocolToken, underlyingToken] = await Promise.all([
      this.helpers.getTokenMetadata(CVXCRV_WRAPPER_ADDRESS),
      this.helpers.getTokenMetadata(underlyingTokenAddress),
    ])

    return [
      {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
        rewardTokens: await Promise.all(rewardTokens),
      },
    ]
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: this.helpers.getProtocolTokenByAddress({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      }),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: this.helpers.getProtocolTokenByAddress({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      }),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { address, name, symbol, decimals, underlyingTokens } =
      this.helpers.getProtocolTokenByAddress({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      })

    const underlyingToken = underlyingTokens[0]!

    return {
      address,
      name,
      symbol,
      decimals,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw: 10n ** BigInt(underlyingToken.decimals),
        },
      ],
    }
  }

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { rewardTokens } = this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })

    const cvxcrvContract = CvxcrvWrapper__factory.connect(
      CVXCRV_WRAPPER_ADDRESS,
      this.provider,
    )

    const extraRewards = await cvxcrvContract.earned.staticCall(userAddress, {
      blockTag: blockNumber,
    })

    return extraRewards.map((result) => {
      const rewardTokenMetadata = rewardTokens.find(
        (token) => token.address === getAddress(result.token),
      )!

      return {
        ...rewardTokenMetadata!,
        balanceRaw: result.amount,
        type: TokenType.UnderlyingClaimable,
      }
    })
  }

  async getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlockReward[]> {
    const { rewardTokens, underlyingTokens, ...protocolToken } =
      this.helpers.getProtocolTokenByAddress({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      })

    return (
      await Promise.all(
        rewardTokens.map(async (extraRewardToken) => {
          const cvxcrvContract = CvxcrvWrapper__factory.connect(
            protocolTokenAddress,
            this.provider,
          )

          const filter = cvxcrvContract.filters[
            'RewardPaid(address,address,uint256,address)'
          ](userAddress, extraRewardToken.address)

          const eventResults =
            await cvxcrvContract.queryFilter<RewardPaidEvent.Event>(
              filter,
              fromBlock,
              toBlock,
            )

          return eventResults.map((event) => {
            const {
              blockNumber,
              args: { _amount: protocolTokenMovementValueRaw },
              transactionHash,
            } = event

            return {
              transactionHash,
              protocolToken,
              tokens: [
                {
                  ...extraRewardToken,
                  balanceRaw: protocolTokenMovementValueRaw,
                  type: TokenType.UnderlyingClaimable,
                },
              ],
              blockNumber: blockNumber,
            }
          })
        }),
      )
    ).flat()
  }
}
