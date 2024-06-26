import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { CvxcrvWrapper__factory } from '../../contracts'
import { RewardPaidEvent } from '../../contracts/CvxcrvWrapper'

const CVXCRV_WRAPPER_ADDRESS = getAddress(
  '0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434',
)

export class ConvexCvxcrvWrapperAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'cvxcrv-wrapper'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https://www.convexfinance.com/',
      iconUrl: buildTrustAssetIconUrl(
        Chain.Ethereum,
        '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
      ),
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const [protocolToken] = await this.getProtocolTokens()

    if (
      protocolTokenAddresses &&
      !protocolTokenAddresses.includes(protocolToken!.address)
    ) {
      return []
    }

    const extraRewardTokens = await this.fetchUnderlyingTokensMetadata(
      protocolToken!.address,
    )

    const contract = CvxcrvWrapper__factory.connect(
      CVXCRV_WRAPPER_ADDRESS,
      this.provider,
    )

    const lpTokenBalance = await contract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    if (lpTokenBalance === 0n) {
      return []
    }

    const extraRewards = await contract.earned.staticCall(userAddress, {
      blockTag: blockNumber,
    })

    return [
      {
        ...protocolToken!,
        balanceRaw: lpTokenBalance,
        type: TokenType.Protocol,
        tokens: extraRewards.map((result) => {
          const rewardTokenMetadata = extraRewardTokens.find(
            (token) => token.address === getAddress(result.token),
          )

          return {
            ...rewardTokenMetadata!,
            address: result.token,
            balanceRaw: result.amount,
            type: TokenType.UnderlyingClaimable,
          }
        }),
      },
    ]
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const contract = CvxcrvWrapper__factory.connect(
      CVXCRV_WRAPPER_ADDRESS,
      this.provider,
    )

    const rewardTokensLength = await contract.rewardLength()

    const rewardTokens = Array.from(
      { length: Number(rewardTokensLength) },
      async (_, i) => {
        const rewardTokenAddress = await contract.rewards(i)

        return getTokenMetadata(
          rewardTokenAddress.reward_token,
          this.chainId,
          this.provider,
        )
      },
    )

    return {
      [CVXCRV_WRAPPER_ADDRESS]: {
        protocolToken: await getTokenMetadata(
          CVXCRV_WRAPPER_ADDRESS,
          this.chainId,
          this.provider,
        ),
        underlyingTokens: await Promise.all(rewardTokens),
      },
    }
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolToken =
      await this.fetchProtocolTokenMetadata(protocolTokenAddress)
    const protocolRewardTokens =
      await this.fetchUnderlyingTokensMetadata(protocolTokenAddress)
    const responsePromises = protocolRewardTokens.map(
      async (extraRewardToken) => {
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
                type: TokenType.Underlying,
              },
            ],
            blockNumber: blockNumber,
          }
        })
      },
    )

    const nestedResults = await Promise.all(responsePromises)
    const response: MovementsByBlock[] = nestedResults.flat()

    return response
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [] // no deposits for rewards
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async unwrapProtocolToken(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    throw new NotImplementedError()
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return underlyingTokens
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
}
