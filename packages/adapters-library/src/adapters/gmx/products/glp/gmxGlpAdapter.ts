import { getAddress } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
  UnwrapExchangeRate,
  UnwrapInput,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  GlpManager__factory,
  RewardReader__factory,
  Vault__factory,
} from '../../contracts'

type GmxGlpAdapterMetadata = {
  glpRewardRouter: string
  vaultAddress: string
  rewardReaderAddress: string
  feeTokenAddress: string
  stakedTokenAddress: string
  protocolToken: Erc20Metadata
  underlyingTokens: Erc20Metadata[]
}

export class GmxGlpAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'glp'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
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
  async buildMetadata(): Promise<GmxGlpAdapterMetadata> {
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

    const protocolToken = await getTokenMetadata(
      await glpManagerContract.glp(),
      this.chainId,
      this.provider,
    )

    return {
      glpRewardRouter,
      vaultAddress,
      rewardReaderAddress,
      feeTokenAddress,
      stakedTokenAddress,
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
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const {
      rewardReaderAddress,
      feeTokenAddress: positionContractAddress,
      protocolToken,
      underlyingTokens,
    } = await this.buildMetadata()

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

    const [[protocolTokenBalance], unwrappedTokenExchangeRates] =
      await Promise.all([
        rewardReaderContract.getDepositBalances(
          userAddress,
          [protocolToken.address],
          [positionContractAddress],
          { blockTag: blockNumber },
        ),
        this.unwrap({
          protocolTokenAddress: protocolToken.address,
          blockNumber,
        }),
      ])

    if (!protocolTokenBalance || protocolTokenBalance === 0n) {
      return []
    }

    const underlyingTokenBalances = underlyingTokens.map((underlyingToken) => {
      const unwrappedTokenExchangeRate =
        unwrappedTokenExchangeRates.tokens?.find(
          (tokenRate) => tokenRate.address === underlyingToken.address,
        )

      const underlyingBalanceRaw =
        (protocolTokenBalance * unwrappedTokenExchangeRate!.underlyingRateRaw) /
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
        balanceRaw: protocolTokenBalance,
        tokens: underlyingTokenBalances,
      },
    ]

    // PRELIMINARY CODE FOR REWARDS
    // const {
    //   rewardReaderAddress,
    //   feeTokenAddress,
    //   stakedTokenAddress,
    //   protocolToken,
    // } = await this.buildMetadata()

    // const rewardReaderContract = RewardReader__factory.connect(
    //   rewardReaderAddress,
    //   this.provider,
    // )

    // const feeTokenContract = RewardTracker__factory.connect(
    //   feeTokenAddress,
    //   this.provider,
    // )

    // const stakedTokenContract = RewardTracker__factory.connect(
    //   stakedTokenAddress,
    //   this.provider,
    // )

    // const [feeTokenRewardAddress, stakedTokenRewardAddress] = await Promise.all(
    //   [feeTokenContract.rewardToken(), stakedTokenContract.rewardToken()],
    // )

    // const [
    //   feeTokenMetadata,
    //   feeTokenRewardMetadata,
    //   stakedTokenMetadata,
    //   stakedTokenRewardMetadata,
    //   stakingInfo,
    // ] = await Promise.all([
    //   getTokenMetadata(feeTokenAddress, this.chainId, this.provider),
    //   getTokenMetadata(feeTokenRewardAddress, this.chainId, this.provider),
    //   getTokenMetadata(stakedTokenAddress, this.chainId, this.provider),
    //   getTokenMetadata(stakedTokenRewardAddress, this.chainId, this.provider),
    //   rewardReaderContract.getStakingInfo(
    //     userAddress,
    //     [feeTokenAddress, stakedTokenAddress],
    //     { blockTag: blockNumber },
    //   ),
    // ])

    // return [
    //   {
    //     ...protocolToken,
    //     type: TokenType.Protocol,
    //     tokens: [
    //       {
    //         ...feeTokenMetadata,
    //         type: TokenType.Reward,
    //         balanceRaw: 0n,
    //         tokens: [
    //           {
    //             ...feeTokenRewardMetadata,
    //             type: TokenType.Underlying,
    //             balanceRaw: stakingInfo[0]!,
    //           },
    //         ],
    //       },
    //       {
    //         ...stakedTokenMetadata,
    //         type: TokenType.Reward,
    //         balanceRaw: 0n,
    //         tokens: [
    //           {
    //             ...stakedTokenRewardMetadata,
    //             type: TokenType.Underlying,
    //             balanceRaw: stakingInfo[5]!,
    //           },
    //         ],
    //       },
    //     ],
    //   },
    // ]
  }

  async unwrap({ blockNumber }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { protocolToken, vaultAddress, underlyingTokens } =
      await this.buildMetadata()

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
      ...protocolToken,
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
    return await this.getProtocolTokenMovements({
      protocolToken:
        await this.fetchProtocolTokenMetadata(protocolTokenAddress),

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
    return await this.getProtocolTokenMovements({
      protocolToken:
        await this.fetchProtocolTokenMetadata(protocolTokenAddress),

      filter: {
        fromBlock,
        toBlock,
        from: userAddress,
        to: ZERO_ADDRESS,
      },
    })
  }

  protected async fetchProtocolTokenMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    return (await this.buildMetadata()).protocolToken
  }

  protected async fetchUnderlyingTokensMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    return (await this.buildMetadata()).underlyingTokens
  }

  protected getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number | undefined
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }
  protected unwrapProtocolToken(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    throw new NotImplementedError()
  }
}
