import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { NotImplementedError } from '../../../../core/errors/errors'
import {
  ProtocolDetails,
  PositionType,
  GetAprInput,
  GetApyInput,
  TokenBalance,
  TokenType,
  ProtocolTokenApr,
  ProtocolTokenApy,
  UnderlyingTokenRate,
  Underlying,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {RocketTokenRETH__factory} from "../../../rocket-pool/contracts";

export class RocketPoolRethAdapter extends SimplePoolAdapter
{
  productId = 'reth'


  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'RocketPool',
      description: 'Rocket Pool rETH Adapter',
      siteUrl: 'https://rocketpool.net',
      iconUrl: 'https://rocketpool.net/files/reth-logo.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [await this.fetchProtocolTokenMetadata()]
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()
    const [underlyingTokenRate] = await this.getUnderlyingTokenConversionRate(
        protocolTokenBalance,
        blockNumber,
    )

    const underlyingTokenBalanceRaw =
        (protocolTokenBalance.balanceRaw *
            underlyingTokenRate!.underlyingRateRaw) /
        10n ** BigInt(protocolTokenBalance.decimals)

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: underlyingTokenBalanceRaw,
      },
    ]
  }

  protected async fetchProtocolTokenMetadata(): Promise<Erc20Metadata> {
    return {
      address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
      name: 'Rocket Pool rETH',
      symbol: 'rETH',
      decimals: 18,
    }
  }

  protected async getUnderlyingTokenConversionRate(
      protocolTokenMetadata: Erc20Metadata,
      blockNumber?: number,
  ): Promise<UnderlyingTokenRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const rEthContract = RocketTokenRETH__factory.connect(
        protocolTokenMetadata.address,
        this.provider,
    )

    const underlyingRateRaw = await rEthContract.getExchangeRate({
      blockTag: blockNumber,
    })

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw,
      },
    ]
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    return [
      {
        address: ZERO_ADDRESS,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
    ]
  }
}
