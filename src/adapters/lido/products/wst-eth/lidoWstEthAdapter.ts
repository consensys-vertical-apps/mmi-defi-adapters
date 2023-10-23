import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { NotImplementedError } from '../../../../core/errors/errors'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetEventsInput,
  MovementsByBlock,
  GetApyInput,
  GetAprInput,
  GetClaimableRewardsInput,
  ProtocolRewardPosition,
  ProtocolTokenApr,
  ProtocolTokenApy,
  TokenType,
  TokenBalance,
  Underlying,
  UnderlyingTokenRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { WstEthToken__factory } from '../../contracts'

export class LidoWstEthAdapter extends SimplePoolAdapter {
  productId = 'wst-eth'

  stEthAdapter: IProtocolAdapter

  constructor(params: ProtocolAdapterParams) {
    super(params)

    this.stEthAdapter = params.adaptersController.fetchAdapter(
      params.chainId,
      params.protocolId,
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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [await this.fetchProtocolTokenMetadata()]
  }

  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new NotImplementedError()
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
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
    return {
      address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
      name: 'Wrapped liquid staked Ether 2.0',
      symbol: 'WSTETH',
      decimals: 18,
    }
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    return [
      {
        address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        name: 'Liquid staked Ether 2.0',
        symbol: 'stETH',
        decimals: 18,
      },
    ]
  }

  protected async getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
    blockNumber?: number | undefined,
  ): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      protocolTokenBalance.address,
      this.provider,
    )

    const stEthBalance = await wstEthContract.getStETHByWstETH(
      protocolTokenBalance.balanceRaw,
      {
        blockTag: blockNumber,
      },
    )

    const stEthTokenUnderlyingRate =
      await this.stEthAdapter.getProtocolTokenToUnderlyingTokenRate({
        protocolTokenAddress: underlyingToken!.address,
        blockNumber,
      })

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: stEthBalance,
        tokens: stEthTokenUnderlyingRate.tokens!.map((underlying) => {
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
                  10 ** protocolTokenBalance.decimals,
              ),
          }
        }),
      },
    ]
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const pricePerShareRaw = await wstEthContract.stEthPerToken({
      blockTag: blockNumber,
    })

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
