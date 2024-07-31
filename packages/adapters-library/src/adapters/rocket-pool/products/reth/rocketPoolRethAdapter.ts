import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { RocketTokenRETH__factory } from '../../../rocket-pool/contracts'

export class RocketPoolRethAdapter extends SimplePoolAdapter {
  productId = 'reth'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

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

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()
    const [unwrappedTokenExchangeRate] = await this.unwrapProtocolToken(
      protocolTokenBalance,
      blockNumber,
    )

    const underlyingTokenBalanceRaw =
      (protocolTokenBalance.balanceRaw *
        unwrappedTokenExchangeRate!.underlyingRateRaw) /
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
      address: getAddress('0xae78736Cd615f374D3085123A210448E74Fc6393'),
      name: 'Rocket Pool rETH',
      symbol: 'rETH',
      decimals: 18,
    }
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnwrappedTokenExchangeRate[]> {
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
