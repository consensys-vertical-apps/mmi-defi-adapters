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
import { PoolStaking, PoolStaking__factory } from '../../contracts'

const METAMASK_POOLED_STAKING_CONTRACT = getAddress(
  '0x4FEF9D741011476750A243aC70b9789a63dd47Df',
)
const LIDO_STAKED_ETH = getAddress('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84')

export class MetamaskPooledStakingAdapter implements IProtocolAdapter {
  productId = 'pooled-staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: {
      topic0:
        '0x861a4138e41fb21c121a7dbb1053df465c837fc77380cc7226189a662281be2c',
      userAddressIndex: 2,
    },
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  private poolContract: PoolStaking

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

    this.poolContract = PoolStaking__factory.connect(
      METAMASK_POOLED_STAKING_CONTRACT,
      this.provider,
    )
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Metamask',
      description: 'Metamask defi adapter',
      siteUrl: 'https://portfolio.metamask.io/',
      iconUrl: 'https://portfolio.metamask.io/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<[ProtocolToken]> {
    const underlyingToken = await this.helpers.getTokenMetadata(LIDO_STAKED_ETH)
    return [
      {
        address: METAMASK_POOLED_STAKING_CONTRACT,
        symbol: 'METAMASK',
        name: 'Metamask',
        decimals: 18,
        underlyingTokens: [underlyingToken],
      },
    ]
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const [{ underlyingTokens, ...protocolToken }] =
      await this.getProtocolTokens()

    const balance = await this.poolContract.getShares(input.userAddress)

    return [
      {
        ...protocolToken,
        type: TokenType.Protocol,
        balanceRaw: balance,
      },
    ]
  }

  async unwrap({ blockNumber }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const [{ underlyingTokens, ...protocolToken }] =
      await this.getProtocolTokens()

    const totalSupply = await this.poolContract.totalShares({
      blockTag: blockNumber,
    })

    const totalReserve = await this.poolContract.totalAssets({
      blockTag: blockNumber,
    })

    const underlyingRateRaw = BigInt(
      Math.round(
        (Number(totalReserve) * 10 ** protocolToken.decimals) /
          Number(totalSupply),
      ),
    )

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingTokens[0]!,
          type: TokenType.Underlying,
          underlyingRateRaw,
        },
      ],
    }
  }
}
