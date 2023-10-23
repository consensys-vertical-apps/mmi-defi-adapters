import { Erc20__factory } from '../../../../contracts'
import { TransferEvent } from '../../../../contracts/Erc20'
import { Chain } from '../../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  GetProfitsInput,
  GetApyInput,
  GetAprInput,
  GetClaimableRewardsInput,
  GetConversionRateInput,
  ProtocolRewardPosition,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProfitsWithRange,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenType,
  BaseTokenMovement,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { WstEthToken__factory } from '../../contracts'

export type LidoWstEthMetadata = {
  contractToken: Erc20Metadata
  underlyingToken: Erc20Metadata
}

export class LidoWstEthAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'wst-eth'
  protocolId: Protocol
  chainId: Chain

  stEthAdapter: IProtocolAdapter

  private provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.stEthAdapter = adaptersController.fetchAdapter(
      chainId,
      protocolId,
      'st-eth',
    )
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Lido wstEth',
      description: 'Lido defi adapter for wstEth',
      siteUrl: 'https://stake.lido.fi/wrap',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84/logo.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'wst-eth-token' })
  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    }

    const contractAddress = contractAddresses[this.chainId]!

    const wstEthContract = WstEthToken__factory.connect(
      contractAddress,
      this.provider,
    )
    const stEthContractAddress = await wstEthContract.stETH()

    const contractToken = await getTokenMetadata(
      contractAddress,
      this.chainId,
      this.provider,
    )
    const underlyingToken = await getTokenMetadata(
      stEthContractAddress,
      this.chainId,
      this.provider,
    )

    const metadataObject: LidoWstEthMetadata = {
      contractToken,
      underlyingToken,
    }

    return metadataObject
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [(await this.buildMetadata()).contractToken]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { contractToken, underlyingToken } = await this.buildMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      contractToken.address,
      this.provider,
    )

    const wstEthBalance = await wstEthContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    const stEthBalance = await wstEthContract.getStETHByWstETH(wstEthBalance, {
      blockTag: blockNumber,
    })

    const stEthTokenUnderlyingRate =
      await this.stEthAdapter.getProtocolTokenToUnderlyingTokenRate({
        protocolTokenAddress: underlyingToken.address,
        blockNumber,
      })

    const tokens = [
      {
        ...contractToken,
        type: TokenType.Protocol,
        balanceRaw: wstEthBalance,
        tokens: [
          {
            ...underlyingToken,
            type: TokenType.Underlying,
            balanceRaw: stEthBalance,
            tokens: stEthTokenUnderlyingRate.tokens?.map((underlying) => {
              return {
                address: underlying.address,
                name: underlying.name,
                symbol: underlying.symbol,
                decimals: underlying.decimals,
                type: TokenType.Underlying,
                balanceRaw:
                  stEthBalance *
                  BigInt(
                    Number(underlying.underlyingRateRaw) /
                      10 ** contractToken.decimals,
                  ),
              }
            }),
          },
        ],
      },
    ]

    return tokens
  }

  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new NotImplementedError()
  }

  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      protocolTokenAddress,
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(),
      fromBlock,
      toBlock,
      from: ZERO_ADDRESS,
      to: userAddress,
    })
  }

  async getClaimedRewards({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      protocolTokenAddress,
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(),
      fromBlock,
      toBlock,
      from: userAddress,
      to: ZERO_ADDRESS,
    })
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async getProtocolTokenToUnderlyingTokenRate({
    blockNumber,
  }: GetConversionRateInput): Promise<ProtocolTokenUnderlyingRate> {
    const { contractToken, underlyingToken } = await this.buildMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      contractToken.address,
      this.provider,
    )

    const pricePerShareRaw = await wstEthContract.stEthPerToken({
      blockTag: blockNumber,
    })

    return {
      ...contractToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw: pricePerShareRaw,
        },
      ],
    }
  }

  async getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }
  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  protected async fetchProtocolTokenMetadata(): Promise<Erc20Metadata> {
    const { contractToken } = await this.buildMetadata()

    return contractToken
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.buildMetadata()

    return [underlyingToken]
  }

  /**
   * Util used by both getDeposits and getWithdrawals
   */
  private async getMovements({
    protocolTokenAddress,
    underlyingTokens,
    fromBlock,
    toBlock,
    from,
    to,
  }: {
    protocolTokenAddress: string
    underlyingTokens: Erc20Metadata[]
    fromBlock: number
    toBlock: number
    from: string
    to: string
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = Erc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const protocolToken = await this.fetchProtocolTokenMetadata()

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
        } = transferEvent

        const protocolTokenPrice =
          await this.getProtocolTokenToUnderlyingTokenRate({
            blockNumber,
            protocolTokenAddress,
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
}
