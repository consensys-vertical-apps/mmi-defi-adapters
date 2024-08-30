import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
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
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import {
  LpStaking,
  LpStaking__factory,
  LpStakingTime,
  LpStakingTime__factory,
} from '../../contracts'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { filterMapAsync } from '../../../../core/utils/filters'
import { staticChainData } from '../../common/staticChainData'
import { AddressLike, BigNumberish } from 'ethers'
import { TypedContractMethod } from '../../contracts/common'

type AdditionalMetadata = {
  poolIndex: number
  rewardToken: Erc20Metadata
  lpStakingType: 'LpStaking' | 'LpStakingTime'
  lpStakingAddress: string
}

export class StargateLpStakingAdapter implements IProtocolAdapter {
  productId = 'lp-staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    version: 2,
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
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
      name: 'Stargate',
      description: 'Stargate defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'farm-token' })
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const { lpStakingAddress, lpStakingType, lpStakingTimeMetisAddress } =
      staticChainData[this.chainId]!

    const lpStakingContract =
      lpStakingType === 'LpStaking'
        ? LpStaking__factory.connect(lpStakingAddress, this.provider)
        : LpStakingTime__factory.connect(lpStakingAddress, this.provider)

    const rewardTokenPromise = (
      lpStakingType === 'LpStaking'
        ? (lpStakingContract as LpStaking).stargate()
        : (lpStakingContract as LpStakingTime).eToken()
    ).then((rewardTokenAddress) =>
      getTokenMetadata(rewardTokenAddress, this.chainId, this.provider),
    )

    const poolLength = await lpStakingContract.poolLength()

    const poolPromises: Promise<ProtocolToken<AdditionalMetadata>>[] = []

    poolPromises.push(
      ...Array.from({ length: Number(poolLength) }, async (_, i) => {
        const { lpToken: protocolTokenAddress } =
          await lpStakingContract.poolInfo(i)

        const protocolToken = await getTokenMetadata(
          protocolTokenAddress,
          this.chainId,
          this.provider,
        )

        return {
          ...protocolToken,
          poolIndex: i,
          rewardToken: await rewardTokenPromise,
          lpStakingType,
          lpStakingAddress,
        }
      }),
    )

    if (lpStakingTimeMetisAddress) {
      poolPromises.push(
        (async () => {
          const lpStakingTimeMetisContract = LpStakingTime__factory.connect(
            lpStakingTimeMetisAddress,
            this.provider,
          )

          const [{ lpToken: protocolTokenAddress }, rewardTokenAddress] =
            await Promise.all([
              lpStakingTimeMetisContract.poolInfo(0),
              lpStakingTimeMetisContract.eToken(),
            ])

          const [protocolToken, rewardToken] = await Promise.all([
            getTokenMetadata(protocolTokenAddress, this.chainId, this.provider),
            getTokenMetadata(rewardTokenAddress, this.chainId, this.provider),
          ])

          return {
            ...protocolToken,
            poolIndex: 0,
            rewardToken,
            lpStakingType: 'LpStakingTime',
            lpStakingAddress: lpStakingTimeMetisAddress,
          }
        })(),
      )
    }

    return await Promise.all(poolPromises)
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
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
    const protocolTokens = await this.getProtocolTokens()

    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const lpStakingContract =
        protocolToken.lpStakingType === 'LpStaking'
          ? LpStaking__factory.connect(
              protocolToken.lpStakingAddress,
              this.provider,
            )
          : LpStakingTime__factory.connect(
              protocolToken.lpStakingAddress,
              this.provider,
            )

      const { amount } = await lpStakingContract.userInfo(
        protocolToken.poolIndex,
        userAddress,
        {
          blockTag: blockNumber,
        },
      )

      if (!amount) {
        return undefined
      }

      return {
        type: TokenType.Protocol,
        address: protocolToken.address,
        symbol: protocolToken.symbol,
        name: protocolToken.name,
        decimals: protocolToken.decimals,
        balanceRaw: amount,
      }
    })
  }

  async getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddress,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { lpStakingAddress, lpStakingType } = staticChainData[this.chainId]!
    const { poolIndex, rewardToken } = await this.getProtocolTokenByAddress(
      protocolTokenAddress,
    )

    const rewardFunctionInput = [
      poolIndex,
      userAddress,
      { blockTag: blockNumber },
    ] as const

    const pendingStargateReward = await (lpStakingType === 'LpStaking'
      ? LpStaking__factory.connect(
          lpStakingAddress,
          this.provider,
        ).pendingStargate(...rewardFunctionInput)
      : LpStakingTime__factory.connect(
          lpStakingAddress,
          this.provider,
        ).pendingEmissionToken(...rewardFunctionInput))

    return [
      {
        ...rewardToken,
        type: TokenType.UnderlyingClaimable,
        balanceRaw: pendingStargateReward,
      },
    ]
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
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

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
