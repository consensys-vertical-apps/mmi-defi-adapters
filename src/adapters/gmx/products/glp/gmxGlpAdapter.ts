import { formatUnits } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { TransferEvent } from '../../../../contracts/Erc20'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { aggregateTrades } from '../../../../core/utils/aggregateTrades'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { formatProtocolTokenArrayToMap } from '../../../../core/utils/protocolTokenToMap'
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
  BaseTokenMovement,
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
  feeTokenAddress: string
  stakedTokenAddress: string
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
          feeTokenAddress: string
          stakedTokenAddress: string
        }
      >
    > = {
      [Chain.Arbitrum]: {
        glpManagerContractAddress: '0x3963FfC9dff443c2A94f21b129D429891E32ec18',
        rewardReaderAddress: '0x8BFb8e82Ee4569aee78D03235ff465Bd436D40E0',
        feeTokenAddress: '0x4e971a87900b931fF39d1Aad67697F49835400b6',
        stakedTokenAddress: '0x1aDDD80E6039594eE970E5872D247bf0414C8903',
      },
      [Chain.Avalanche]: {
        glpManagerContractAddress: '0xD152c7F25db7F4B95b7658323c5F33d176818EE4',
        rewardReaderAddress: '0x04Fc11Bd28763872d143637a7c768bD96E44c1b6',
        feeTokenAddress: '0xd2D1162512F927a7e282Ef43a362659E4F2a728F',
        stakedTokenAddress: '0x9e295B5B976a184B14aD8cd72413aD846C299660',
      },
    }

    const {
      glpManagerContractAddress,
      rewardReaderAddress,
      feeTokenAddress,
      stakedTokenAddress,
    } = glpAddresses[this.chainId]!

    const glpManagerContract = GlpManager__factory.connect(
      glpManagerContractAddress,
      this.provider,
    )

    const vaultAddress = await glpManagerContract.vault()
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
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const {
      rewardReaderAddress,
      feeTokenAddress: positionContractAddress,
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
        [positionContractAddress],
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

    const protocolTokenSupply = await protocolTokenContract.totalSupply({
      blockTag: blockNumber,
    })

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

  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new NotImplementedError()
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

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(
        protocolTokenAddress,
      ),
      filter: {
        smartContractAddress: protocolTokenAddress,
        fromBlock,
        toBlock,
        from: undefined,
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
    return await this.getMovements({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(
        protocolTokenAddress,
      ),
      filter: {
        smartContractAddress: protocolTokenAddress,
        fromBlock,
        toBlock,
        from: userAddress,
        to: undefined,
      },
    })
  }

  async getMovements({
    protocolToken,
    underlyingTokens,
    filter: { smartContractAddress, fromBlock, toBlock, from, to },
  }: {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
    filter: {
      smartContractAddress: string
      fromBlock: number
      toBlock: number
      from?: string
      to?: string
    }
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = Erc20__factory.connect(
      smartContractAddress,
      this.provider,
    )

    const filter = protocolTokenContract.filters.Transfer(from, to)

    const eventResults =
      await protocolTokenContract.queryFilter<TransferEvent.Event>(
        filter,
        fromBlock,
        toBlock,
      )

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value: protocolTokenMovementValueRaw },
          transactionHash,
        } = transferEvent

        const protocolTokenPrice =
          await this.getProtocolTokenToUnderlyingTokenRate({
            blockNumber,
            protocolTokenAddress: protocolToken.address,
          })

        return {
          protocolToken: {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          },
          underlyingTokensMovement: underlyingTokens.reduce(
            (accumulator, currentToken) => {
              const currentTokenPrice = protocolTokenPrice.tokens?.find(
                (price) => price.address === currentToken.address,
              )

              if (!currentTokenPrice) {
                throw new Error('No price for underlying token at this time')
              }

              const movementValueRaw =
                (protocolTokenMovementValueRaw *
                  currentTokenPrice.underlyingRateRaw) /
                BigInt(10 ** currentTokenPrice.decimals)

              return {
                ...accumulator,

                [currentToken.address]: {
                  ...currentToken,
                  transactionHash,
                  movementValueRaw,
                },
              }
            },
            {} as Record<string, BaseTokenMovement>,
          ),
          blockNumber,
        }
      }),
    )
  }

  async getProfits({
    userAddress,
    fromBlock,
    toBlock,
  }: GetProfitsInput): Promise<ProfitsWithRange> {
    const [endPositionValues, startPositionValues] = await Promise.all([
      this.getPositions({
        userAddress,
        blockNumber: toBlock,
      }).then(formatProtocolTokenArrayToMap),
      this.getPositions({
        userAddress,
        blockNumber: fromBlock,
      }).then(formatProtocolTokenArrayToMap),
    ])

    const tokens = await Promise.all(
      Object.values(endPositionValues).map(
        async ({
          protocolTokenMetadata,
          underlyingTokenPositions: underlyingEndPositions,
        }) => {
          const getEventsInput: GetEventsInput = {
            userAddress,
            protocolTokenAddress: protocolTokenMetadata.address,
            fromBlock,
            toBlock,
          }

          const [withdrawals, deposits] = await Promise.all([
            this.getWithdrawals(getEventsInput).then(aggregateTrades),
            this.getDeposits(getEventsInput).then(aggregateTrades),
          ])

          return {
            ...protocolTokenMetadata,
            type: TokenType.Protocol,
            tokens: Object.values(underlyingEndPositions).map(
              ({
                address,
                name,
                symbol,
                decimals,
                balanceRaw: endPositionValueRaw,
              }) => {
                const startPositionValueRaw =
                  startPositionValues[protocolTokenMetadata.address]
                    ?.underlyingTokenPositions[address]?.balanceRaw ?? 0n

                const calculationData = {
                  withdrawalsRaw: withdrawals[address] ?? 0n,
                  depositsRaw: deposits[address] ?? 0n,
                  endPositionValueRaw: endPositionValueRaw ?? 0n,
                  startPositionValueRaw,
                }

                let profitRaw =
                  calculationData.endPositionValueRaw +
                  calculationData.withdrawalsRaw -
                  calculationData.depositsRaw -
                  calculationData.startPositionValueRaw

                if (
                  this.getProtocolDetails().positionType === PositionType.Borrow
                ) {
                  profitRaw *= -1n
                }

                return {
                  address,
                  name,
                  symbol,
                  decimals,
                  profitRaw,
                  type: TokenType.Underlying,
                  calculationData: {
                    withdrawalsRaw: withdrawals[address] ?? 0n,
                    withdrawals: formatUnits(
                      withdrawals[address] ?? 0n,
                      decimals,
                    ),
                    depositsRaw: deposits[address] ?? 0n,
                    deposits: formatUnits(deposits[address] ?? 0n, decimals),
                    startPositionValueRaw: startPositionValueRaw ?? 0n,
                    startPositionValue: formatUnits(
                      startPositionValueRaw ?? 0n,
                      decimals,
                    ),
                    endPositionValueRaw,
                    endPositionValue: formatUnits(
                      endPositionValueRaw ?? 0n,
                      decimals,
                    ),
                  },
                }
              },
            ),
          }
        },
      ),
    )

    return { tokens, fromBlock, toBlock }
  }

  private async fetchProtocolTokenMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    return (await this.buildMetadata()).protocolToken
  }

  private async fetchUnderlyingTokensMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    return (await this.buildMetadata()).underlyingTokens
  }
}
