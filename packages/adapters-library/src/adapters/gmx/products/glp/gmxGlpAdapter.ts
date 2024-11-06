import { getAddress } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  GlpManager__factory,
  RewardReader__factory,
  RewardTracker__factory,
  Vault__factory,
} from '../../contracts'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import { AdaptersController } from '../../../../core/adaptersController'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { Helpers } from '../../../../scripts/helpers'
import { Protocol } from '../../../protocols'
import { filterMapAsync } from '../../../../core/utils/filters'

type RewardTokenMetadata = Erc20Metadata & {
  rewardTrackerAddress: string
}

type AdditionalMetadata = {
  glpRewardRouter: string
  vaultAddress: string
  rewardReaderAddress: string
  feeTokenAddress: string
  stakedTokenAddress: string

  positionContractAddress: string
  rewardTokens: RewardTokenMetadata[]
}

export class GmxGlpAdapter implements IProtocolAdapter {
  productId = 'glp'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
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
      name: 'GMX',
      description: 'GMX Liquidity Provider Token adapter',
      siteUrl: 'https://app.gmx.io',
      iconUrl:
        'https://gmx.io//static/media/ic_gmx_40.72a1053e8344ef876100ac72aff70ead.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const glpAddresses: Partial<
      Record<
        Chain,
        {
          glpRewardRouter: string
          glpManagerContractAddress: string
          rewardReaderAddress: string
          feeTokenAddress: string
          stakedTokenAddress: string
        }
      >
    > = {
      [Chain.Arbitrum]: {
        glpRewardRouter: getAddress(
          '0xB95DB5B167D75e6d04227CfFFA61069348d271F5',
        ),
        glpManagerContractAddress: getAddress(
          '0x3963FfC9dff443c2A94f21b129D429891E32ec18',
        ),
        rewardReaderAddress: getAddress(
          '0x8BFb8e82Ee4569aee78D03235ff465Bd436D40E0',
        ),
        feeTokenAddress: getAddress(
          '0x4e971a87900b931fF39d1Aad67697F49835400b6',
        ),
        stakedTokenAddress: getAddress(
          '0x1aDDD80E6039594eE970E5872D247bf0414C8903',
        ),
      },
      [Chain.Avalanche]: {
        glpRewardRouter: getAddress(
          '0xB70B91CE0771d3f4c81D87660f71Da31d48eB3B3',
        ),
        glpManagerContractAddress: getAddress(
          '0xD152c7F25db7F4B95b7658323c5F33d176818EE4',
        ),
        rewardReaderAddress: getAddress(
          '0x04Fc11Bd28763872d143637a7c768bD96E44c1b6',
        ),
        feeTokenAddress: getAddress(
          '0xd2D1162512F927a7e282Ef43a362659E4F2a728F',
        ),
        stakedTokenAddress: getAddress(
          '0x9e295B5B976a184B14aD8cd72413aD846C299660',
        ),
      },
    }

    const {
      glpRewardRouter,
      glpManagerContractAddress,
      rewardReaderAddress,
      feeTokenAddress,
      stakedTokenAddress,
    } = glpAddresses[this.chainId]!

    const glpManagerContract = GlpManager__factory.connect(
      glpManagerContractAddress,
      this.provider,
    )

    const vaultAddress = getAddress(await glpManagerContract.vault())
    const vaultContract = Vault__factory.connect(vaultAddress, this.provider)

    const allWhitelistedTokensLength =
      await vaultContract.allWhitelistedTokensLength()

    const underlyingTokens = await Promise.all(
      [...Array(Number(allWhitelistedTokensLength)).keys()].map(
        async (index) => {
          const underlyingTokenAddress =
            await vaultContract.allWhitelistedTokens(index)

          const underlyingToken = await getTokenMetadata(
            underlyingTokenAddress,
            this.chainId,
            this.provider,
          )

          return underlyingToken
        },
      ),
    )

    const rewardTokens = await Promise.all(
      [stakedTokenAddress, feeTokenAddress].map(async (trackerAddress) => {
        const trackerContract = RewardTracker__factory.connect(
          trackerAddress,
          this.provider,
        )

        return {
          ...(await this.helpers.getTokenMetadata(
            await trackerContract.rewardToken(),
          )),
          rewardTrackerAddress: trackerAddress,
        }
      }),
    )

    const protocolToken = await getTokenMetadata(
      await glpManagerContract.glp(),
      this.chainId,
      this.provider,
    )

    return [
      {
        glpRewardRouter,
        vaultAddress,
        rewardReaderAddress,
        feeTokenAddress,
        stakedTokenAddress,
        ...protocolToken,
        underlyingTokens,
        positionContractAddress: feeTokenAddress,
        rewardTokens,
      },
    ]
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { rewardReaderAddress, positionContractAddress, ...protocolToken } = (
      await this.getProtocolTokens()
    )[0]!

    if (
      protocolTokenAddresses &&
      !protocolTokenAddresses.includes(protocolToken.address)
    ) {
      return []
    }

    const rewardReaderContract = RewardReader__factory.connect(
      rewardReaderAddress,
      this.provider,
    )

    const [protocolTokenBalance] =
      await rewardReaderContract.getDepositBalances(
        userAddress,
        [protocolToken.address],
        [positionContractAddress],
        { blockTag: blockNumber },
      )

    if (!protocolTokenBalance || protocolTokenBalance === 0n) {
      return []
    }

    return [
      {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        type: TokenType.Protocol,
        balanceRaw: protocolTokenBalance,
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
