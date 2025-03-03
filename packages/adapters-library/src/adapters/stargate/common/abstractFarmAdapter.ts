import type { AdaptersController } from '../../../core/adaptersController.js'
import type { Chain } from '../../../core/constants/chains.js'
import { CacheToDb } from '../../../core/decorators/cacheToDb.js'
import { NotImplementedError } from '../../../core/errors/errors.js'
import type { Helpers } from '../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider.js'
import { filterMapAsync } from '../../../core/utils/filters.js'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  type GetPositionsInput,
  type GetRewardPositionsInput,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  TokenType,
  type UnderlyingReward,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../types/adapter.js'
import type { Protocol } from '../../protocols.js'
import {
  type LpStaking,
  type LpStakingTime,
  LpStakingTime__factory,
  LpStaking__factory,
} from '../contracts/index.js'
import type { AdditionalMetadata } from '../products/farm/stargateFarmAdapter.js'

export abstract class AbstractStargateFarmAdapter implements IProtocolAdapter {
  productId = 'farm'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  abstract staticChainData: {
    factoryAddress: string
    lpStakingAddress: string
    lpStakingType: 'LpStaking' | 'LpStakingTime'
    lpStakingTimeMetisAddress?: string
  }

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
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
      name: 'Stargate Farm',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const { lpStakingAddress, lpStakingType, lpStakingTimeMetisAddress } =
      this.staticChainData

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
          underlyingTokens: [],
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
            underlyingTokens: [],
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
    const { lpStakingAddress, lpStakingType } = this.staticChainData
    const { poolIndex, rewardToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

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

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
