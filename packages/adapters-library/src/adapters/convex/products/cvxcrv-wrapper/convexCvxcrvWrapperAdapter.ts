import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
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
}
