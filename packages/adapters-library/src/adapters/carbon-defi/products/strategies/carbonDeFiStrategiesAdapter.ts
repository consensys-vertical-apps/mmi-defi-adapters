import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { CarbonController__factory, Voucher__factory } from '../../contracts'
import {
  StrategyCreatedEvent,
  StrategyDeletedEvent,
  StrategyUpdatedEvent,
} from '../../contracts/CarbonController'

const contractAddresses: Partial<
  Record<
    Chain,
    { carbonControllerAddress: string; voucherContractAddress: string }
  >
> = {
  [Chain.Ethereum]: {
    carbonControllerAddress: '0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1',
    voucherContractAddress: '0x3660F04B79751e31128f6378eAC70807e38f554E',
  },
  [Chain.Sei]: {
    carbonControllerAddress: '0xe4816658ad10bF215053C533cceAe3f59e1f1087',
    voucherContractAddress: '0xA4682A2A5Fe02feFF8Bd200240A41AD0E6EaF8d5',
  },
}

const StrategyUpdateReasonEdit = 0n

export class CarbonDeFiStrategiesAdapter implements IProtocolAdapter {
  productId = 'strategies'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: {
      topic0:
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      userAddressIndex: 2,
    },
  }

  adaptersController: AdaptersController

  provider: CustomJsonRpcProvider

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
      name: 'CarbonDeFi',
      description: 'CarbonDeFi adapter for strategy balances',
      siteUrl: 'https://carbondefi.xyz',
      iconUrl: 'https://app.carbondefi.xyz/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    return [
      {
        address: contractAddresses[this.chainId]!.voucherContractAddress,
        name: 'CarbonDeFi NFT',
        symbol: 'CARBON-STRAT',
        decimals: 0,
        underlyingTokens: [],
      },
    ]
  }

  private protocolTokenName(token0Symbol: string, token1Symbol: string) {
    return `${token0Symbol} / ${token1Symbol}`
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const carbonControllerContract = CarbonController__factory.connect(
      contractAddresses[this.chainId]!.carbonControllerAddress,
      this.provider,
    )
    const voucherContract = Voucher__factory.connect(
      contractAddresses[this.chainId]!.voucherContractAddress,
      this.provider,
    )

    const strategyIds = await voucherContract.tokensByOwner(userAddress, 0, 0, {
      blockTag: blockNumber,
    })

    if (strategyIds.length > 0) {
      const results = await Promise.all(
        strategyIds.map(async (id) =>
          carbonControllerContract.strategy(id, {
            blockTag: blockNumber,
          }),
        ),
      )
      if (!results || results.length === 0) return []

      const positions: ProtocolPosition[] = await Promise.all(
        results.map(async (strategyRes) => {
          const token0Metadata: Erc20Metadata = await getTokenMetadata(
            strategyRes.tokens[0],
            this.chainId,
            this.provider,
          )
          const token1Metadata: Erc20Metadata = await getTokenMetadata(
            strategyRes.tokens[1],
            this.chainId,
            this.provider,
          )

          return {
            address: contractAddresses[this.chainId]!.voucherContractAddress,
            name: this.protocolTokenName(
              token0Metadata.symbol,
              token1Metadata.symbol,
            ),
            symbol: this.protocolTokenName(
              token0Metadata.symbol,
              token1Metadata.symbol,
            ),
            decimals: 18,
            type: TokenType.Protocol,
            tokenId: strategyRes.id.toString(),
            balanceRaw: 10n ** 18n,
            tokens: [
              {
                type: TokenType.Underlying,

                balanceRaw: strategyRes.orders[0].y,
                ...token0Metadata,
              },
              {
                type: TokenType.Underlying,

                balanceRaw: strategyRes.orders[1].y,
                ...token1Metadata,
              },
            ],
          }
        }),
      )

      return positions
    }

    return []
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
