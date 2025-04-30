import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'

export class MetamaskValidatorStakingAdapter implements IProtocolAdapter {
  productId = 'validator-staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: {
      topic0:
        '0xac1020908b5f7134d59c1580838eba6fc42dd8c28bae65bf345676bba1913f8e',
      userAddressIndex: 2,
    },
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
      name: 'Metamask',
      description: 'Metamask defi adapter',
      siteUrl: 'https://portfolio.metamask.io/',
      iconUrl: 'https://portfolio.metamask.io/favicon.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<[ProtocolToken]> {
    return [
      {
        address: getAddress('0xdc71affc862fceb6ad32be58e098423a7727bebd'),
        name: 'Metamask Staked ETH',
        symbol: 'stETH',
        decimals: 18,
        underlyingTokens: [
          {
            address: ZERO_ADDRESS,
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
          },
        ],
      },
    ]
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions({
    userAddress,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const url = `https://staking.api.cx.metamask.io/v1/staking/balances/1?address=${userAddress}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch protocol tokens: ${response.statusText}`)
    }

    const data: {
      balances: {
        type: 'staked-pool' | 'staked-validator'
        name: string
        balance: string
      }[]
    } = await response.json()

    const validatorStakingBalance = data.balances.find(
      (balance) => balance.type === 'staked-validator',
    )
    if (!validatorStakingBalance) {
      throw new Error('No validator staking balance found')
    }

    const { underlyingTokens, ...protocolToken } = (
      await this.getProtocolTokens()
    )[0]

    return [
      {
        ...protocolToken,
        type: TokenType.Protocol,
        balanceRaw: BigInt(validatorStakingBalance.balance),
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
    })
  }
}
