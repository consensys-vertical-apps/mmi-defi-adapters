import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { TrustWalletProtocolIconMap } from '../../../../core/utils/buildIconUrl'
import { filterMapAsync } from '../../../../core/utils/filters'
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
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import { CompoundV3__factory } from '../../contracts'
import { addresses } from '../lending/compoundV3LendingAdapter'

export class CompoundV3BorrowAdapter implements IProtocolAdapter {
  productId = 'borrow'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
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
      name: 'CompoundV3',
      description: 'CompoundV3 defi adapter',
      siteUrl: 'https:',
      iconUrl: TrustWalletProtocolIconMap[Protocol.CompoundV3],
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const protocolTokens: ProtocolToken[] = []

    const chainAddresses = addresses[this.chainId as keyof typeof addresses]

    for (const [compoundName, compoundAddress] of Object.entries(
      chainAddresses,
    )) {
      const compoundFactory = CompoundV3__factory.connect(
        compoundAddress,
        this.provider,
      )

      const baseToken = await compoundFactory.baseToken()

      const baseTokenDetails = await this.helpers.getTokenMetadata(baseToken)

      const protocolToken: ProtocolToken = {
        ...baseTokenDetails,
        address: compoundAddress,
        symbol: compoundName,
        name: compoundName,
        underlyingTokens: [baseTokenDetails],
      }

      protocolTokens.push(protocolToken)
    }

    return protocolTokens
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()
    const result = await filterMapAsync(
      protocolTokens,
      async ({ underlyingTokens, ...protocolToken }) => {
        const compoundFactory = CompoundV3__factory.connect(
          protocolToken.address,
          this.provider,
        )
        const userBalance = await compoundFactory.borrowBalanceOf(
          input.userAddress,
        )

        if (userBalance > 0) {
          return {
            balanceRaw: 1n,
            ...protocolToken,
            type: TokenType.Protocol,
            tokens: [
              {
                ...underlyingTokens[0]!,
                balanceRaw: userBalance,
                type: TokenType.Underlying,
              },
            ],
          } as ProtocolPosition
        }

        return undefined
      },
    )

    return result
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
    })
  }
}
