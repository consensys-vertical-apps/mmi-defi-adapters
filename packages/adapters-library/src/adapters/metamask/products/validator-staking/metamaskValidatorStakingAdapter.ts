import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import {
  Erc20ExtendedMetadata,
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
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import { NotImplementedError } from '../../../../core/errors/errors'

interface StakingResponse {
  accounts: Account[]
}

interface Account {
  account: string
  validators: Validator[]
}

interface Validator {
  publicKey: string
  account: string
  index: number
  balance: string
  rate: string
  daysActive: number
  status: string
  availableCLRewards: string
  availableELRewards: string
  slashed: boolean
  contractAddress: string
}

interface SingleProtocolToken extends ProtocolToken {
  underlyingTokens: [Erc20ExtendedMetadata]
}

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
      name: 'MetaMask',
      description: 'MetaMask defi adapter',
      siteUrl: 'https://portfolio.metamask.io/',
      iconUrl: 'https://portfolio.metamask.io/favicon.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<[SingleProtocolToken]> {
    const underlyingToken = await this.helpers.getTokenMetadata(ZERO_ADDRESS)
    return [
      {
        address: getAddress('0xdc71affc862fceb6ad32be58e098423a7727bebd'),
        name: 'MetaMask Validator',
        symbol: 'stETH',
        decimals: 18,
        underlyingTokens: [underlyingToken],
      },
    ]
  }

  async getPositions({
    userAddress,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const url = `https://staking.api.cx.metamask.io/v1/direct-staking/validators/prod?addresses=${userAddress}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch protocol tokens: ${response.statusText}`)
    }

    const data: StakingResponse = await response.json()

    const { underlyingTokens, ...protocolToken } = (
      await this.getProtocolTokens()
    )[0]

    const underlyingToken = underlyingTokens[0]

    return data.accounts.flatMap((result) => {
      return result.validators.map((validator) => {
        return {
          ...protocolToken,
          type: TokenType.Protocol,
          balanceRaw: BigInt(validator.balance),
          tokens: [
            {
              ...underlyingToken,
              balanceRaw: BigInt(validator.balance),
              type: TokenType.Underlying,
            },
            {
              ...underlyingToken,
              balanceRaw: BigInt(validator.availableCLRewards),
              type: TokenType.UnderlyingClaimable,
            },
            {
              ...underlyingToken,
              balanceRaw: BigInt(validator.availableELRewards),
              type: TokenType.UnderlyingClaimable,
            },
          ],
        }
      })
    })
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
