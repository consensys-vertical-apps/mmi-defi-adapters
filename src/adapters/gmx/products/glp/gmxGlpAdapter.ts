import { Erc20__factory } from '../../../../contracts'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolDetails,
  PositionType,
  GetEventsInput,
  MovementsByBlock,
  GetAprInput,
  GetApyInput,
  GetTotalValueLockedInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenTvl,
  ProtocolRewardPosition,
  GetClaimableRewardsInput,
  TokenType,
  ProtocolAdapterParams,
  GetConversionRateInput,
  GetPositionsInput,
  GetProfitsInput,
  ProfitsWithRange,
  ProtocolPosition,
  ProtocolTokenUnderlyingRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import {
  GlpManager__factory,
  RewardReader__factory,
  Vault__factory,
} from '../../contracts'

type GMXGlpAdapterMetadata = {
  vaultAddress: string
  rewardReaderAddress: string
  rewardTrackerAddress: string
  protocolToken: Erc20Metadata
  underlyingTokens: Erc20Metadata[]
}

export class GMXGlpAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'glp'
  protocolId: Protocol
  chainId: Chain

  private provider: CustomJsonRpcProvider

  constructor({ provider, chainId, protocolId }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'GMX',
      description: 'GMX Liquidity Provider Token adapter',
      siteUrl: 'https://https://app.gmx.io',
      iconUrl:
        'https://gmx.io//static/media/ic_gmx_40.72a1053e8344ef876100ac72aff70ead.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'glp' })
  async buildMetadata(): Promise<GMXGlpAdapterMetadata> {
    const glpAddresses: Partial<
      Record<
        Chain,
        {
          glpManagerContractAddress: string
          rewardReaderAddress: string
          rewardTrackerAddress: string
        }
      >
    > = {
      [Chain.Arbitrum]: {
        glpManagerContractAddress: '0x3963FfC9dff443c2A94f21b129D429891E32ec18',
        rewardReaderAddress: '0x8BFb8e82Ee4569aee78D03235ff465Bd436D40E0',
        rewardTrackerAddress: '0x4e971a87900b931fF39d1Aad67697F49835400b6',
      },
      // [Chain.Avalanche]: {
      //   glpManagerContractAddress: '0xD152c7F25db7F4B95b7658323c5F33d176818EE4',
      //   rewardReaderAddress: '0x04Fc11Bd28763872d143637a7c768bD96E44c1b6',
      // },
    }

    const {
      glpManagerContractAddress,
      rewardReaderAddress,
      rewardTrackerAddress,
    } = glpAddresses[this.chainId]!

    const glpManagerContract = GlpManager__factory.connect(
      glpManagerContractAddress,
      this.provider,
    )

    const [vaultAddressPromise, glpTokenAddressPromise] = [
      glpManagerContract.vault(),
      glpManagerContract.glp(),
    ]

    const vaultAddress = await vaultAddressPromise
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

    const glpTokenAddress = await glpTokenAddressPromise
    const protocolToken = await getTokenMetadata(
      glpTokenAddress,
      this.chainId,
      this.provider,
    )

    return {
      vaultAddress,
      rewardReaderAddress,
      rewardTrackerAddress,
      protocolToken,
      underlyingTokens,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [(await this.buildMetadata()).protocolToken]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const {
      vaultAddress,
      rewardReaderAddress,
      rewardTrackerAddress,
      protocolToken,
      underlyingTokens,
    } = await this.buildMetadata()

    const rewardReaderContract = RewardReader__factory.connect(
      rewardReaderAddress,
      this.provider,
    )

    const [[protocolTokenBalance], underlyingTokenRates] = await Promise.all([
      rewardReaderContract.getDepositBalances(
        userAddress,
        [protocolToken.address],
        [rewardTrackerAddress],
        { blockTag: blockNumber },
      ),
      this.getProtocolTokenToUnderlyingTokenRate({
        protocolTokenAddress: protocolToken.address,
        blockNumber,
      }),
    ])

    const underlyingTokenBalances = underlyingTokens.map((underlyingToken) => {
      const underlyingTokenRate = underlyingTokenRates.tokens?.find(
        (tokenRate) => tokenRate.address === underlyingToken.address,
      )

      const underlyingBalanceRaw =
        (protocolTokenBalance! * underlyingTokenRate!.underlyingRateRaw) /
        10n ** BigInt(protocolToken.decimals)

      return {
        ...underlyingToken,
        type: TokenType.Underlying,
        balanceRaw: underlyingBalanceRaw,
      }
    })

    return [
      {
        ...protocolToken,
        type: TokenType.Protocol,
        balanceRaw: protocolTokenBalance!,
        tokens: underlyingTokenBalances,
      },
    ]
  }

  async getProtocolTokenToUnderlyingTokenRate({
    blockNumber,
  }: GetConversionRateInput): Promise<ProtocolTokenUnderlyingRate> {
    const { protocolToken, vaultAddress, underlyingTokens } =
      await this.buildMetadata()

    const vaultContract = Vault__factory.connect(vaultAddress, this.provider)

    const protocolTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const protocolTokenSupply = await protocolTokenContract.totalSupply()

    const underlyingTokenRates = await Promise.all(
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
      ...protocolToken,
      type: TokenType.Protocol,
      baseRate: 1,
      tokens: underlyingTokenRates,
    }
  }

  getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
    throw new NotImplementedError()
  }

  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new NotImplementedError()
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }
  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }
}
