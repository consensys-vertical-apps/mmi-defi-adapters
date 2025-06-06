import { AbiCoder, keccak256 } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
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
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import {
  NavOracle,
  NavOracle__factory,
  OpenFundMarket,
  OpenFundMarket__factory,
  OpenFundRedemptionConcrete,
  OpenFundRedemptionConcrete__factory,
  OpenFundRedemptionDelegate,
  OpenFundRedemptionDelegate__factory,
  OpenFundShareConcrete,
  OpenFundShareConcrete__factory,
  OpenFundShareDelegate,
  OpenFundShareDelegate__factory,
} from '../../contracts'
import {
  SOLV_YIELD_MARKETS,
  SolvYieldMarketConfig,
  SolvYieldMarketPoolConfig,
} from './config'

/**
 * Adapter for the Solv Yield Markets listed at https://app.solv.finance/fund
 *
 * Definitions:
 * - "SFT": Semi-Fungible Token, using the ERC-3525 standard
 * - "Fund SFT": The ERC-3525 token that represents a user's share of a given pool
 * - "GOEFS": General Open-end Fund Share, synonym of Fund SFT
 * - "openFundShare": Synonym of Fund SFT
 * - "Redemption SFT": The ERC-3525 token that represents a chunk of user's share of a given pool that they have requested for redemption
 * - "Redemption": To withdraw funds, users trade some amount of their Fund SFT for a Redemption SFT. After some time, they will be able to burn this Redemption SFT in exchange of their underlying
 * - "GOEFR": General Open-end Fund Redemption. Synonym of Redemption SFT
 * - "openFundRedemption": Synonym of Redemption SFT
 * - "Market": A list of pools on the same chain id. For instance the group of Arbitrum pools
 * - "Pool": This for instance https://app.solv.finance/fund/open-fund/detail/5. It's defined by its pool ID, which is derived from the pair [Fund SFT address, Slot]
 * - "Vault": Synonym of pool
 * - "NAV": Net Asset Value. The price of the fund share in the underlying token. For instance, nav = 1.1524 USDC
 * - "Slot": An ERC-3525 token contains slots. In a Solv finance, each of the pools in a given market occupy a slot of the SAME ERC-3525 token
 * - "Product ID": Synonym of Slot
 */
export class SolvYieldMarketAdapter implements IProtocolAdapter {
  productId = 'yield-market'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  private readonly yieldMarketConfig: SolvYieldMarketConfig

  private readonly navOracleContract: NavOracle
  private readonly openFundMarketContract: OpenFundMarket
  private readonly openFundShareDelegateContract: OpenFundShareDelegate
  private readonly openFundShareConcreteContract: OpenFundShareConcrete
  private readonly openFundRedemptionDelegateContract: OpenFundRedemptionDelegate
  private readonly openFundRedemptionConcreteContract: OpenFundRedemptionConcrete

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

    this.yieldMarketConfig = SOLV_YIELD_MARKETS[this.chainId]!

    const {
      navOracleAddress,
      openFundMarketAddress,
      openFundShareDelegateAddress,
      openFundShareConcreteAddress,
      openFundRedemptionDelegateAddress,
      openFundRedemptionConcreteAddress,
    } = this.yieldMarketConfig

    this.navOracleContract = NavOracle__factory.connect(
      navOracleAddress,
      this.provider,
    )

    this.openFundMarketContract = OpenFundMarket__factory.connect(
      openFundMarketAddress,
      this.provider,
    )

    this.openFundShareDelegateContract = OpenFundShareDelegate__factory.connect(
      openFundShareDelegateAddress,
      this.provider,
    )

    this.openFundShareConcreteContract = OpenFundShareConcrete__factory.connect(
      openFundShareConcreteAddress,
      this.provider,
    )

    this.openFundRedemptionDelegateContract =
      OpenFundRedemptionDelegate__factory.connect(
        openFundRedemptionDelegateAddress,
        this.provider,
      )

    this.openFundRedemptionConcreteContract =
      OpenFundRedemptionConcrete__factory.connect(
        openFundRedemptionConcreteAddress,
        this.provider,
      )
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Solv',
      description: 'Solv defi adapter for Yield Market vaults',
      siteUrl: 'https://solv.finance/',
      iconUrl: 'https://solv.finance/favicon.ico',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getProtocolTokens(): Promise<ProtocolToken[]> {
    throw new NotImplementedError()
  }

  /**
   * @example this.getPoolConfigBy('name', 'GMX V2 USDC - A')
   */
  private getPoolConfigBy(
    paramName: keyof SolvYieldMarketPoolConfig,
    value: string,
  ) {
    const poolConfig = this.yieldMarketConfig.pools.find(
      (pool) => pool[paramName] === value,
    )
    if (!poolConfig)
      throw new Error(`No pool config with ${paramName} = ${value}`)
    return poolConfig
  }

  /**
   * Each position in this chain's market is represented by holding either a GOEFS or a GOEFR. We can see them as NFTs.
   * The actual pool of the position is represented by the SFT's slot.
   * The value of the pool is represented by the balance of the SFT. This is where we rely on the Semi-Fungibily.
   *
   * For instance, let's say Alice has 4 positions on Arbitrum market:
   * - 100 USDC in pool "GMX V2 USDC - A"
   * - 50 USDC  in pool "GMX V2 USDC - A" (again)
   * - 0.0001 WBTC in pool "GMX V2 WBTC - A"
   * - 42 USDT in pool "MUX USDT - A", set for redemption
   *
   * Then she holds (see ./config.ts for complete slots)
   * - 1 GOEFS with tokenId=A, slot="5310..." and balanceOf=aaa
   * - 1 GOEFS with tokenId=B, slot="5310..." and balanceOf=bbb
   * - 1 GOEFS with tokenId=C, slot="9047..." and balanceOf=ccc
   * - 1 GOEFR with tokenId=X, slot="XXXX..." and balanceOf=xxx
   */
  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { openFundShareDelegateAddress, openFundRedemptionDelegateAddress } =
      this.yieldMarketConfig
    const { userAddress, blockNumber } = input

    const [sharesTokenIds, redemptionTokenIds] = await Promise.all([
      this.getTokenIds(userAddress, blockNumber!, 'share'),
      this.getTokenIds(userAddress, blockNumber!, 'redemption'),
    ])

    const [shares, redemptions] = await Promise.all([
      filterMapAsync(sharesTokenIds, async (tokenId) =>
        this.getPosition(openFundShareDelegateAddress, blockNumber!, tokenId),
      ),
      filterMapAsync(redemptionTokenIds, async (tokenId) =>
        this.getPosition(
          openFundRedemptionDelegateAddress,
          blockNumber!,
          tokenId,
        ),
      ),
    ])

    return [...shares, ...redemptions]
  }

  /**
   * Build the position represented by the Nth GOEFS or GOEFR that the user holds
   */
  private async getPosition(
    sftAddress: string,
    blockNumber: number,
    tokenId: bigint,
  ): Promise<ProtocolPosition | undefined> {
    const isShare =
      sftAddress === this.yieldMarketConfig.openFundShareDelegateAddress

    const delegateContract = isShare
      ? this.openFundShareDelegateContract
      : this.openFundRedemptionDelegateContract

    const balance = await delegateContract['balanceOf(uint256)'](tokenId, {
      blockTag: blockNumber,
    })

    if (!balance) return

    const decimals = await delegateContract.valueDecimals({
      blockTag: blockNumber,
    })
    const slot = await delegateContract.slotOf(tokenId, {
      blockTag: blockNumber,
    })

    const { id, name, currencyAddress } = this.getPoolConfigBy(
      isShare ? 'slotInShareSft' : 'slotInRedemptionSft',
      slot.toString(),
    )

    const poolName = isShare ? name : `${name} | Redemption pending`

    const [latestSetNavTime] = await this.navOracleContract.poolNavInfos(id, {
      blockTag: blockNumber,
    })
    const [nav] = await this.navOracleContract.getSubscribeNav(
      id,
      latestSetNavTime,
      {
        blockTag: blockNumber,
      },
    )

    const {
      symbol: underlyingSymbol,
      decimals: underlyingDecimals,
      name: underlyingName,
    } = await this.helpers.getTokenMetadata(currencyAddress)

    const position: ProtocolPosition = {
      type: TokenType.Protocol,
      balanceRaw: balance,
      address: sftAddress,
      tokenId: tokenId.toString(),
      name: poolName,
      symbol: poolName,
      decimals: Number(decimals),
      tokens: [
        {
          type: TokenType.Underlying,
          address: currencyAddress,
          priceRaw: nav,
          balanceRaw: (balance * nav) / 10n ** decimals,
          name: underlyingName,
          symbol: underlyingSymbol,
          decimals: Number(underlyingDecimals),
        },
      ],
    }

    return position
  }

  /**
   * Returns a promise that resolves to the list of tokenIds (bigints) that
   * the user holds for either the GOEFS or the GOEFR.
   *
   * Use the flag `sftType` to choose between GOEFS and GOEFR.
   */
  private async getTokenIds(
    userAddress: string,
    blockNumber: number,
    sftType: 'share' | 'redemption' = 'share',
  ): Promise<bigint[]> {
    const contract =
      sftType === 'share'
        ? this.openFundShareDelegateContract
        : this.openFundRedemptionDelegateContract

    const tokensCount = await contract['balanceOf(address)'](userAddress, {
      blockTag: blockNumber,
    })

    if (!tokensCount) return []

    const indexes = [...Array(Number(tokensCount)).keys()]

    const tokenIds = await Promise.all(
      indexes.map((index) =>
        contract.tokenOfOwnerByIndex(userAddress, index, {
          blockTag: blockNumber,
        }),
      ),
    )

    return tokenIds
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
