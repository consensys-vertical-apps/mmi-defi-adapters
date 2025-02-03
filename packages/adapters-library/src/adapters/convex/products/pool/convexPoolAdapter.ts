import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { filterMapSync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants'
import { ConvexFactory__factory } from '../../contracts'

type AdditionalMetadata = {
  poolId: number
}

export class ConvexPoolAdapter implements IProtocolAdapter {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
    userEvent: 'Transfer',
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
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https://www.convexfinance.com/',
      iconUrl: buildTrustAssetIconUrl(
        Chain.Ethereum,
        '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
      ),
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    const pools = await convexFactory.poolLength()

    const metadata: ProtocolToken<AdditionalMetadata>[] = []
    await Promise.all(
      Array.from({ length: Number(pools) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const [convexToken, underlyingToken] = await Promise.all([
          getTokenMetadata(convexData.token, this.chainId, this.provider),
          getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
        ])

        metadata.push({
          ...convexToken,
          poolId: i,
          underlyingTokens: [underlyingToken],
        })
      }),
    )

    return metadata
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    if (input.protocolTokenAddresses) {
      return await this.helpers.getBalanceOfTokens({
        ...input,
        protocolTokens,
      })
    }

    const protocolTokenAddresses = await this.openPositions({
      protocolTokens,
      userAddress: input.userAddress,
      blockNumber: input.blockNumber,
    })

    return await this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokenAddresses,
      protocolTokens,
    })
  }

  private async openPositions({
    protocolTokens,
    userAddress,
    blockNumber,
  }: {
    protocolTokens: ProtocolToken<AdditionalMetadata>[]
    userAddress: string
    blockNumber?: number
  }): Promise<string[]> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    const depositedFilter = convexFactory.filters.Deposited(
      userAddress,
      undefined,
      undefined,
    )

    const userDepositedEvents = await convexFactory.queryFilter(
      depositedFilter,
      undefined,
      blockNumber,
    )

    const protocolTokenAddresses = filterMapSync(
      userDepositedEvents,
      (event) =>
        protocolTokens.find(
          (pool) => pool.poolId === Number(event.args?.poolid),
        )?.address,
    )

    return [...new Set(protocolTokenAddresses)]
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return this.helpers.unwrapOneToOne({
      protocolToken: protocolToken,
      underlyingTokens,
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }
}
