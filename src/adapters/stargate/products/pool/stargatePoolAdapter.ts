import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { Protocol } from '../../..'
import { Erc20__factory, StargateToken__factory } from '../../../../contracts'
import { Chain } from '../../../../core/constants/chains'
import { getBalances } from '../../../../core/utils/getBalances'
import {
  getDeposits,
  getWithdrawals,
} from '../../../../core/utils/getMovements'
import { getOneDayProfit } from '../../../../core/utils/getOneDayProfit'
import { ERC20Metadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetPositionsInput,
  GetPricesInput,
  GetProfitsInput,
  GetTotalValueLockedInput,
  IProtocolAdapter,
  MovementsByBlock,
  PositionType,
  ProfitsTokensWithRange,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  TokenType,
} from '../../../../types/adapter'
import { StargatePoolMetadata } from '../../buildMetadata'

export class StargatePoolAdapter implements IProtocolAdapter {
  private metadata: StargatePoolMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain
  private protocolTokens: ERC20Metadata[]

  constructor({
    metadata,
    provider,
    chainId,
  }: {
    metadata: StargatePoolMetadata
    provider: ethers.providers.StaticJsonRpcProvider
    chainId: Chain
  }) {
    this.metadata = metadata
    this.provider = provider
    this.chainId = chainId
    this.protocolTokens = Object.values(this.metadata).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.Stargate,
      name: 'Stargate',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
    }
  }

  async getProtocolTokens(): Promise<ERC20Metadata[]> {
    return this.protocolTokens
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    const protocolTokensBalances = await getBalances({
      chainId: this.chainId,
      provider: this.provider,
      userAddress,
      blockNumber,
      tokens: this.protocolTokens,
    })

    const tokens = await Promise.all(
      protocolTokensBalances.map(async (protocolTokenBalance) => {
        const amountLPtoLD = await this.stargateTokenContract(
          protocolTokenBalance.address,
        ).amountLPtoLD(protocolTokenBalance.balanceRaw)

        const underlyingTokenMetadata =
          this.metadata[protocolTokenBalance.address]!.underlyingToken

        const underlyingTokenBalance = {
          ...underlyingTokenMetadata,
          balanceRaw: BigInt(amountLPtoLD.toString()),
          balance: formatUnits(amountLPtoLD, underlyingTokenMetadata.decimals),
          type: TokenType.Underlying,
        }

        return {
          ...protocolTokenBalance,
          type: TokenType.Protocol,
          tokens: [underlyingTokenBalance],
        }
      }),
    )

    return tokens
  }

  async getPricePerShare({
    blockNumber,
    protocolTokenAddress,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken> {
    const { protocolToken, underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const oneToken = BigInt(1 * 10 ** protocolToken.decimals)

    const pricePerShareRaw = await this.stargateTokenContract(
      protocolToken.address,
    ).amountLPtoLD(oneToken, {
      blockTag: blockNumber,
    })

    const pricePerShare = formatUnits(
      pricePerShareRaw,
      underlyingToken.decimals,
    )

    return {
      ...protocolToken,
      share: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          pricePerShareRaw: BigInt(pricePerShareRaw.toString()),
          pricePerShare,
        },
      ],
    }
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]> {
    // TODO
    return []
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const protocolTokenContract = Erc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    return await getWithdrawals({
      userAddress,
      fromBlock,
      toBlock,
      protocolToken,
      underlyingTokens: [underlyingToken],
      protocolTokenContract,
      getPricePerShare: this.getPricePerShare.bind(this),
    })
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const protocolTokenContract = Erc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    return await getDeposits({
      userAddress,
      fromBlock,
      toBlock,
      protocolToken,
      underlyingTokens: [underlyingToken],
      protocolTokenContract,
      getPricePerShare: this.getPricePerShare.bind(this),
    })
  }

  async getOneDayProfit(
    input: GetProfitsInput,
  ): Promise<ProfitsTokensWithRange> {
    return await getOneDayProfit({
      ...input,
      chainId: this.chainId,
      getPositions: this.getPositions.bind(this),
      getWithdrawals: this.getWithdrawals.bind(this),
      getDeposits: this.getDeposits.bind(this),
    })
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return []
  }

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
    return {} as ProtocolAprToken
  }

  async getApy(_input: GetApyInput): Promise<ProtocolApyToken> {
    return {} as ProtocolApyToken
  }

  private fetchProtocolTokenMetadata(protocolTokenAddress: string) {
    const protocolTokenMetadata = this.metadata[protocolTokenAddress]

    if (!protocolTokenMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token not found')
      throw new Error('Protocol token not found')
    }

    return protocolTokenMetadata
  }

  private stargateTokenContract(address: string) {
    return StargateToken__factory.connect(address, this.provider)
  }
}
