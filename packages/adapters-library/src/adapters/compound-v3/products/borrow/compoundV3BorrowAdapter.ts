import type { AdaptersController } from '../../../../core/adaptersController.js'
import type { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import type { Helpers } from '../../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import { filterMapAsync } from '../../../../core/utils/filters.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  type GetPositionsInput,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  TokenType,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../../types/adapter.js'
import type { Protocol } from '../../../protocols.js'
import { CompoundV3__factory } from '../../contracts/index.js'
import { addresses } from '../lending/compoundV3LendingAdapter.js'

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
      iconUrl: 'https://',
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
    tokenId,
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
