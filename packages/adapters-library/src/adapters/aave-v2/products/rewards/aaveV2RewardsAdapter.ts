import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { AAVE_ICON_URL } from '../../../aave-v3/products/rewards/aaveV3RewardsAdapter'
import { Protocol } from '../../../protocols'
import { protocolDataProviderContractAddresses } from '../../common/aaveBasePoolAdapter'
import {
  ProtocolDataProvider__factory,
  StakedTokenIncentivesController__factory,
} from '../../contracts'

type AdditionalMetadata = {
  reserveTokensWithEmissions: string[]
}

export class AaveV2RewardsAdapter implements IProtocolAdapter {
  productId = 'rewards'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: {
      topic0:
        '0x2468f9268c60ad90e2d49edb0032c8a001e733ae888b3ab8e982edf535be1a76',
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
      name: 'Aave v2 Reward',
      description: 'Aave v2 defi adapter for rewards',
      siteUrl: 'https://aave.com/',
      iconUrl: AAVE_ICON_URL,
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const stakedTokensIncentiveControllerAddresses: Partial<
      Record<Chain, string>
    > = {
      [Chain.Ethereum]: getAddress(
        '0xd784927ff2f95ba542bfc824c8a8a98f3495f6b5',
      ),
      [Chain.Polygon]: getAddress('0x357D51124f59836DeD84c8a1730D72B749d8BC23'),
      [Chain.Avalanche]: getAddress(
        '0x01D83Fe6A10D2f2B7AF17034343746188272cAc9',
      ),
    }
    const stakedTokensIncentiveControllerAddress =
      stakedTokensIncentiveControllerAddresses[this.chainId]!

    const stakedTokensIncentiveController =
      StakedTokenIncentivesController__factory.connect(
        stakedTokensIncentiveControllerAddress,
        this.provider,
      )

    const protocolDataProvider = ProtocolDataProvider__factory.connect(
      protocolDataProviderContractAddresses[this.protocolId]![this.chainId]![0]!
        .protocolDataProvider,
      this.provider,
    )

    const reserveTokens = await protocolDataProvider.getAllReservesTokens()

    const reserveTokensWithEmissions = (
      await Promise.all(
        reserveTokens.map(async ({ tokenAddress }) => {
          const reserveTokenAddresses =
            await protocolDataProvider.getReserveTokensAddresses(tokenAddress)

          const reserveTokensWithEmissions = await filterMapAsync(
            reserveTokenAddresses,
            async (reserveTokenAddress) => {
              const assetDetails =
                await stakedTokensIncentiveController.assets(
                  reserveTokenAddress,
                )

              return assetDetails.emissionPerSecond
                ? reserveTokenAddress
                : undefined
            },
          )

          return reserveTokensWithEmissions
        }),
      )
    ).flat()

    const rewardTokenAddress =
      await stakedTokensIncentiveController.REWARD_TOKEN()

    const rewardToken = await this.helpers.getTokenMetadata(rewardTokenAddress)

    return [
      {
        address: stakedTokensIncentiveControllerAddress,
        name: 'Aave v2 Rewards',
        symbol: 'Rewards',
        decimals: rewardToken.decimals,
        underlyingTokens: [rewardToken],
        reserveTokensWithEmissions,
      },
    ]
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { underlyingTokens, reserveTokensWithEmissions, ...protocolToken } = (
      await this.getProtocolTokens()
    )[0]!

    if (
      protocolTokenAddresses &&
      !protocolTokenAddresses.includes(protocolToken.address)
    ) {
      return []
    }

    const stakedTokensIncentiveController =
      StakedTokenIncentivesController__factory.connect(
        protocolToken.address,
        this.provider,
      )

    const rewardAmount =
      await stakedTokensIncentiveController.getRewardsBalance(
        reserveTokensWithEmissions,
        userAddress,
        { blockTag: blockNumber },
      )

    if (!rewardAmount) {
      return []
    }

    return [
      {
        ...protocolToken,
        type: TokenType.Protocol,
        balanceRaw: rewardAmount,
        tokens: [
          {
            ...underlyingTokens[0]!,
            type: TokenType.UnderlyingClaimable,
            balanceRaw: rewardAmount,
          },
        ],
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
    throw new NotImplementedError()
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
