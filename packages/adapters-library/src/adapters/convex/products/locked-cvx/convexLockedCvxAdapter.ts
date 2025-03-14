import { AdaptersController } from '../../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  GetRewardPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { CvxLockerV2__factory } from '../../contracts'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class ConvexLockedCvxAdapter implements IProtocolAdapter {
  productId = 'locked-cvx'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: {
      topic0:
        '0x9cfd25589d1eb8ad71e342a86a8524e83522e3936c0803048c08f6d9ad974f40',
      userAddressIndex: 1,
    },
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
      description: 'Convex adapter for locked CVX',
      siteUrl: 'https://www.convexfinance.com/lock-cvx',
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
    const poolAddress = '0x72a19342e8F1838460eBFCCEf09F6585e32db86E'
    const cvxTokenAddress = '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'

    const lockerContract = CvxLockerV2__factory.connect(
      poolAddress,
      this.provider,
    )

    const [protocolToken, underlyingToken, rewards] = await Promise.all([
      this.helpers.getTokenMetadata(poolAddress),
      this.helpers.getTokenMetadata(cvxTokenAddress),
      lockerContract.claimableRewards(ZERO_ADDRESS),
    ])

    const rewardTokens = await Promise.all(
      rewards.map((reward) => this.helpers.getTokenMetadata(reward.token)),
    )

    return [
      {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
        rewardTokens,
      },
    ]
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { name, address, symbol, decimals } = (
      await this.getProtocolTokens()
    )[0]!

    if (protocolTokenAddresses && !protocolTokenAddresses.includes(address)) {
      return []
    }

    const lockerContract = CvxLockerV2__factory.connect(address, this.provider)

    const lockedBalances = await lockerContract.lockedBalances(userAddress, {
      blockTag: blockNumber,
    })

    if (lockedBalances.total === 0n) {
      return []
    }

    return [
      {
        address,
        name,
        symbol,
        decimals,
        balanceRaw: lockedBalances.total,
        type: TokenType.Protocol,
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return this.helpers.unwrapOneToOne({
      protocolToken,
      underlyingTokens,
    })
  }

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { address, rewardTokens } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const lockerContract = CvxLockerV2__factory.connect(address, this.provider)

    const rewardsBalance = await lockerContract.claimableRewards(userAddress, {
      blockTag: blockNumber,
    })

    return rewardsBalance.map((reward) => {
      return {
        ...rewardTokens.find((token) => token.address === reward.token)!,
        balanceRaw: reward.amount,
        type: TokenType.UnderlyingClaimable,
      }
    })
  }
}
