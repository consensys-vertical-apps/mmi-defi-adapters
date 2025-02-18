import { Erc20__factory } from '../../../../contracts'
import { AdaptersController } from '../../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
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
import { contractAddresses } from '../../common/contractAddresses'
import {
  GlpManager__factory,
  RewardRouter__factory,
  RewardTracker__factory,
  Vault__factory,
} from '../../contracts'

type RewardTokenMetadata = Erc20Metadata & {
  rewardTrackerAddress: string
}

type AdditionalMetadata = {
  vaultAddress: string
  positionContractAddress: string
  rewardTokens: RewardTokenMetadata[]
}

export class GmxGlpAdapter implements IProtocolAdapter {
  productId = 'glp'
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
      name: 'GMX',
      description: 'GMX Liquidity Provider Token adapter',
      siteUrl: 'https://app.gmx.io',
      iconUrl:
        'https://gmx.io//static/media/ic_gmx_40.72a1053e8344ef876100ac72aff70ead.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const rewardRouter = RewardRouter__factory.connect(
      contractAddresses[this.chainId]!.glpRewardRouter,
      this.provider,
    )

    const [
      glpAddress,
      glpManagerAddress,
      stakedGlpTrackerAddress,
      feeGlpTrackerAddress,
    ] = await Promise.all([
      rewardRouter.glp(),
      rewardRouter.glpManager(),
      rewardRouter.stakedGlpTracker(),
      rewardRouter.feeGlpTracker(),
    ])

    const glpManagerContract = GlpManager__factory.connect(
      glpManagerAddress,
      this.provider,
    )

    const [vaultAddress, glpMetadata] = await Promise.all([
      glpManagerContract.vault(),
      this.helpers.getTokenMetadata(glpAddress),
    ])

    const vaultContract = Vault__factory.connect(vaultAddress, this.provider)

    const allWhitelistedTokensLength =
      await vaultContract.allWhitelistedTokensLength()

    const underlyingTokens = await Promise.all(
      [...Array(Number(allWhitelistedTokensLength)).keys()].map(
        async (index) => {
          const underlyingTokenAddress =
            await vaultContract.allWhitelistedTokens(index)

          const underlyingToken = await this.helpers.getTokenMetadata(
            underlyingTokenAddress,
          )

          return underlyingToken
        },
      ),
    )

    const rewardTokens = await Promise.all(
      [stakedGlpTrackerAddress, feeGlpTrackerAddress].map(
        async (trackerAddress) => {
          const trackerContract = RewardTracker__factory.connect(
            trackerAddress,
            this.provider,
          )

          const rewardTokenMetadata = await this.helpers.getTokenMetadata(
            await trackerContract.rewardToken(),
          )

          return {
            ...rewardTokenMetadata,
            rewardTrackerAddress: trackerAddress,
          }
        },
      ),
    )

    return [
      {
        ...glpMetadata,
        vaultAddress,
        positionContractAddress: feeGlpTrackerAddress,
        underlyingTokens,
        rewardTokens,
      },
    ]
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolToken = (await this.getProtocolTokens())[0]!

    if (
      protocolTokenAddresses &&
      !protocolTokenAddresses.includes(protocolToken.address)
    ) {
      return []
    }

    const positionContract = RewardTracker__factory.connect(
      protocolToken.positionContractAddress,
      this.provider,
    )

    const amountStaked = await positionContract.depositBalances(
      userAddress,
      protocolToken.address,
      { blockTag: blockNumber },
    )

    if (amountStaked === 0n) {
      return []
    }

    return [
      {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        balanceRaw: amountStaked,
        type: TokenType.Protocol,
      },
    ]
  }

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const protocolToken = this.helpers.getProtocolTokenByAddress({
      protocolTokenAddress,
      protocolTokens: await this.getProtocolTokens(),
    })

    if (!protocolToken.rewardTokens) {
      return []
    }

    return await filterMapAsync(
      protocolToken.rewardTokens,
      async ({ rewardTrackerAddress, ...rewardTokenMetadata }) => {
        const rewardTracker = RewardTracker__factory.connect(
          rewardTrackerAddress,
          this.provider,
        )

        const rewardBalance = await rewardTracker.claimable(userAddress, {
          blockTag: blockNumber,
        })

        if (rewardBalance === 0n) {
          return undefined
        }

        return {
          ...rewardTokenMetadata,
          type: TokenType.UnderlyingClaimable,
          balanceRaw: rewardBalance,
        }
      },
    )
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { vaultAddress, underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const vaultContract = Vault__factory.connect(vaultAddress, this.provider)

    const protocolTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const protocolTokenSupply = await protocolTokenContract.totalSupply({
      blockTag: blockNumber,
    })

    const unwrappedTokenExchangeRates = await Promise.all(
      underlyingTokens.map(async (underlyingToken) => {
        const redemptionCollateral =
          await vaultContract.getRedemptionCollateral(underlyingToken.address, {
            blockTag: blockNumber,
          })

        const underlyingRateRaw =
          redemptionCollateral /
          (protocolTokenSupply / 10n ** BigInt(protocolToken.decimals))

        return {
          ...underlyingToken,
          underlyingRateRaw,
          type: TokenType.Underlying,
        }
      }),
    )

    return {
      address: protocolToken.address,
      name: protocolToken.name,
      symbol: protocolToken.symbol,
      decimals: protocolToken.decimals,
      type: TokenType.Protocol,
      baseRate: 1,
      tokens: unwrappedTokenExchangeRates,
    }
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.helpers.getErc20Movements({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: {
        fromBlock,
        toBlock,
        from: ZERO_ADDRESS,
        to: userAddress,
      },
    })
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.helpers.getErc20Movements({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: {
        fromBlock,
        toBlock,
        from: userAddress,
        to: ZERO_ADDRESS,
      },
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
}
