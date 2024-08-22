import { AbiCoder, keccak256 } from 'ethers'
import { findKey, mapValues } from 'lodash'
import { Erc20__factory } from '../../../../contracts'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { Helpers } from '../../../../scripts/helpers'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
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
  SLOT_TO_PRODUCT_NAME,
  SOLV_YIELD_MARKETS,
  SolvYieldMarketConfig,
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
 * - "openFundShare": Synonym of Redemption SFT
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

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
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
      shareDelegateAddress,
      shareConcreteAddress: openFundShareConcreteAddress,
      redemptionDelegateAddress: openFundRedemptionDelegateAddress,
      redemptionConcreteAddress: openFundRedemptionConcreteAddress,
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
      shareDelegateAddress,
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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
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
    const { userAddress } = input
    const [holdings, redemptions] = await Promise.all([
      this.getHoldings(userAddress),
      this.getRedemptions(userAddress),
    ])
    return [...holdings, ...redemptions]
  }

  private async getHoldings(userAddress: string): Promise<ProtocolPosition[]> {
    const { shareDelegateAddress: openFundShareDelegateAddress } =
      this.yieldMarketConfig

    // Count every instance of the GOEFS that the user holds
    const tokensCount = await this.openFundShareDelegateContract[
      'balanceOf(address)'
    ](userAddress)

    if (!tokensCount) return []

    const indexes = [...Array(Number.parseInt(tokensCount.toString())).keys()]

    // Each GOEFS the user holds represents a position
    return filterMapAsync(indexes, async (index) =>
      this.getHolding(userAddress, openFundShareDelegateAddress, index),
    )
  }

  /**
   * Build the position represented by the Nth GOEFS that the user holds
   */
  private async getHolding(
    userAddress: string,
    sftAddress: string,
    index: number,
  ): Promise<ProtocolPosition> {
    const tokenId =
      await this.openFundShareDelegateContract.tokenOfOwnerByIndex(
        userAddress,
        index,
      )
    const balance = await this.openFundShareDelegateContract[
      'balanceOf(uint256)'
    ](tokenId)
    const decimals = await this.openFundShareDelegateContract.valueDecimals()
    const slot = await this.openFundShareDelegateContract.slotOf(tokenId)
    const [_, currency] = await this.openFundShareConcreteContract.slotBaseInfo(
      slot,
    )
    const poolId = this.computePoolId(slot)
    const [latestSetNavTime] = await this.navOracleContract.poolNavInfos(poolId)
    const [nav] = await this.navOracleContract.getSubscribeNav(
      poolId,
      latestSetNavTime,
    )
    const name = this.getPoolName(slot.toString())

    const {
      symbol: underlyingSymbol,
      decimals: underlyingDecimals,
      name: underlyingName,
    } = await this.helpers.getTokenMetadata(currency)

    const position: ProtocolPosition = {
      type: TokenType.Protocol,
      balanceRaw: balance,
      address: sftAddress,
      tokenId: tokenId.toString(),
      name,
      symbol: name,
      decimals: Number(decimals),
      tokens: [
        {
          type: TokenType.Underlying,
          address: currency,
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

  private async getRedemptions(
    userAddress: string,
  ): Promise<ProtocolPosition[]> {
    const { redemptionDelegateAddress: openFundRedemptionDelegateAddress } =
      this.yieldMarketConfig

    // Count every instance of the GOEFS that the user holds
    const tokensCount = await this.openFundRedemptionDelegateContract[
      'balanceOf(address)'
    ](userAddress)
    if (!tokensCount) return []

    const indexes = [...Array(Number.parseInt(tokensCount.toString())).keys()]

    // Each GOEFR the user holds represents a position
    return filterMapAsync(indexes, async (index) =>
      this.getRedemption(userAddress, openFundRedemptionDelegateAddress, index),
    )
  }

  /**
   * Build the position represented by the Nth GOEFR that the user holds
   */
  private async getRedemption(
    userAddress: string,
    sftAddress: string,
    index: number,
  ): Promise<ProtocolPosition> {
    const tokenId =
      await this.openFundRedemptionDelegateContract.tokenOfOwnerByIndex(
        userAddress,
        index,
      )
    const balance = await this.openFundRedemptionDelegateContract[
      'balanceOf(uint256)'
    ](tokenId)
    const decimals =
      await this.openFundRedemptionDelegateContract.valueDecimals()
    const slot = await this.openFundRedemptionDelegateContract.slotOf(tokenId)
    const [poolId, currency] =
      await this.openFundRedemptionConcreteContract.getRedeemInfo(slot)
    const [latestSetNavTime] = await this.navOracleContract.poolNavInfos(poolId)
    const [nav] = await this.navOracleContract.getSubscribeNav(
      poolId,
      latestSetNavTime,
    )

    const shareSlot = this.slotReverseLookup(poolId)
    const name = `${this.getPoolName(
      shareSlot.toString(),
    )} | Redemption pending`

    const {
      symbol: underlyingSymbol,
      decimals: underlyingDecimals,
      name: underlyingName,
    } = await this.helpers.getTokenMetadata(currency)

    const position: ProtocolPosition = {
      type: TokenType.Protocol,
      balanceRaw: balance,
      address: sftAddress,
      tokenId: tokenId.toString(),
      name,
      symbol: name,
      decimals: Number(decimals),
      tokens: [
        {
          type: TokenType.Underlying,
          address: currency,
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
   * Computes a Pool ID from the SFT address and the slot.
   * Some Solv smart contracts methods accept the pool id instead of the slot.
   *
   * @example
   * const openFundShareDelegateAddress = '0x22799daa45209338b7f938edf251bdfd1e6dcb32'
   * const slot = '5310353805259224968786693768403624884928279211848504288200646724372830798580'
   * computePoolId(sftAddress, slot) // returns '0xe037ef7b5f74bf3c988d8ae8ab06ad34643749ba9d217092297241420d600fce'
   *
   * @see https://github.com/solv-finance/SolvBTC/blob/ef5be00ec22549ac5a323378c2a914166bf0dcc1/contracts/SftWrappedToken.sol#L198
   */
  private computePoolId(slot: bigint): string {
    const { shareDelegateAddress: openFundShareDelegateAddress } =
      this.yieldMarketConfig
    const encodedData = AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [openFundShareDelegateAddress, slot],
    )
    return keccak256(encodedData)
  }

  /**
   * Performs a reverse look up to find the slot matching the passed Pool ID
   */
  private slotReverseLookup(poolId: string) {
    /**
     * Generate an object like:
     * {
     *   "slot1": "poolId1",
     *   "slot2": "poolId2",
     *   ...
     * }
     */
    const slotsToPoolId = mapValues(SLOT_TO_PRODUCT_NAME, (_, key) =>
      this.computePoolId(BigInt(key)),
    )

    // Return the first key where value is passed Pool ID
    const slot = findKey(slotsToPoolId, (value) => value === poolId)

    if (!slot)
      throw new Error('Could not find a slot matching the passed pool ID')

    return slot
  }

  private getPoolName(slot: string): string {
    return SLOT_TO_PRODUCT_NAME[slot] ?? 'Unknown'
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }
}
