import { ethers, getAddress } from 'ethers'
import type { AdaptersController } from '../../../../core/adaptersController.js'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS.js'
import { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import { NotImplementedError } from '../../../../core/errors/errors.js'
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
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import { Protocol } from '../../../protocols.js'
import {
  type IncentivesContract,
  IncentivesContract__factory,
} from '../../contracts/index.js'

export const AAVE_ICON_URL = 'https://cryptologos.cc/logos/aave-aave-logo.png'

export class AaveV3RewardsAdapter implements IProtocolAdapter {
  productId = 'rewards'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  private incentivesContract: IncentivesContract

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: {
      topic0:
        '0x3303facd24627943a92e9dc87cfbb34b15c49b726eec3ad3487c16be9ab8efe8',
      userAddressIndex: 3,
    },
  }

  private INCENTIVES_CONTRACT_ADDRESSES: Partial<Record<Chain, string>> = {
    [Chain.Arbitrum]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Ethereum]: getAddress('0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb'),
    [Chain.Fantom]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Avalanche]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Bsc]: getAddress('0xC206C2764A9dBF27d599613b8F9A63ACd1160ab4'),
    [Chain.Base]: getAddress('0xf9cc4F0D883F1a1eb2c253bdb46c254Ca51E1F44'),
    [Chain.Polygon]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Optimism]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
  }

  private INCENTIVES_CONTRACT_DETAILS: Erc20Metadata

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

    const incentivesContractAddress =
      this.INCENTIVES_CONTRACT_ADDRESSES[this.chainId]

    if (!incentivesContractAddress) {
      throw new NotImplementedError()
    }

    this.incentivesContract = IncentivesContract__factory.connect(
      incentivesContractAddress,
      this.provider,
    )

    /**
     * Fake protocol token created to satisfy return type
     */
    this.INCENTIVES_CONTRACT_DETAILS = {
      address: incentivesContractAddress,
      name: 'Aave V3 Rewards',
      symbol: 'Rewards',
      decimals: 18,
    }
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'AaveV3',
      description: 'AaveV3 defi adapter',
      siteUrl: 'https:',
      iconUrl: AAVE_ICON_URL,
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const rewardTokenAddresses = await this.incentivesContract.getRewardsList()

    const rewardTokens = await Promise.all(
      rewardTokenAddresses.map((rewardToken) => {
        return this.helpers.getTokenMetadata(rewardToken)
      }),
    )

    return [
      { ...this.INCENTIVES_CONTRACT_DETAILS, underlyingTokens: rewardTokens },
    ]
  }

  private detectPositionEventSignature(
    eventSignature = 'Transfer(address,address,uint256)',
  ): string {
    return ethers.id(eventSignature)
  }

  /**
   * Checks if the user has ever opened a position in AaveV3
   * Return AToken addresses if found
   */
  private async openPositions(userAddress: string): Promise<string[]> {
    const topic0 = this.detectPositionEventSignature()
    const topic1 = ethers.zeroPadValue(ZERO_ADDRESS, 32)
    const topic2 = ethers.zeroPadValue(userAddress, 32)

    const logs = await this.provider.getLogs({
      topics: [topic0, topic1, topic2],
      fromBlock: '0x',
      toBlock: 'latest',
    })

    const aTokenAddresses = (
      await this.helpers.metadataProvider.getMetadata({
        protocolId: Protocol.AaveV3,
        productId: 'a-token',
      })
    ).map((token) => token.address)

    const filteredLogs = logs
      .filter((log) => aTokenAddresses.includes(log.address))
      .map((log) => log.address)

    return [...new Set(filteredLogs)]
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()
    const protocolToken = protocolTokens[0]

    if (!protocolToken) {
      throw new Error('No protocol token found')
    }

    if (
      protocolTokenAddresses &&
      protocolTokenAddresses.length > 0 &&
      !protocolTokenAddresses.includes(protocolToken.address)
    ) {
      return []
    }

    const addressFilter = await this.openPositions(userAddress)

    if (!addressFilter.length) {
      return []
    }

    const userRewards = await this.incentivesContract.getAllUserRewards(
      addressFilter,
      userAddress,
      { blockTag: blockNumber },
    )

    const underlyingTokens = await filterMapAsync(
      userRewards.unclaimedAmounts,
      async (unclaimedAmount, i) => {
        if (!unclaimedAmount) {
          return undefined
        }

        const underlying = protocolToken.underlyingTokens.find(
          (underlying) => underlying.address === userRewards.rewardsList[i],
        )!

        return {
          ...underlying,
          type: TokenType.UnderlyingClaimable,
          balanceRaw: unclaimedAmount,
        }
      },
    )

    if (underlyingTokens.length === 0) {
      return []
    }

    return [
      {
        type: TokenType.Protocol,
        balanceRaw: 1n, // choose 1 here as a zero value may cause the position to be ignored on UIs our adapters currently expecting a protocol token but on contract positions there is no token
        ...this.INCENTIVES_CONTRACT_DETAILS,
        tokens: underlyingTokens,
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
