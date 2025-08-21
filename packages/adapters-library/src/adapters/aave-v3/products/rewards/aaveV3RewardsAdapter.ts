import { ethers, getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
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
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import {
  IncentivesContract,
  IncentivesContract__factory,
} from '../../contracts'

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
      metadata: {
        groupPositions: true,
      },
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<[ProtocolToken]> {
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

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const [protocolToken] = await this.getProtocolTokens()

    if (
      protocolTokenAddresses &&
      !protocolTokenAddresses.includes(protocolToken.address)
    ) {
      return []
    }

    const rewards = await filterMapAsync(
      protocolToken.underlyingTokens,
      async (rewardToken) => {
        const accruedReward =
          await this.incentivesContract.getUserAccruedRewards(
            userAddress,
            rewardToken.address,
            { blockTag: blockNumber },
          )

        if (!accruedReward) {
          return undefined
        }

        return {
          ...rewardToken,
          type: TokenType.UnderlyingClaimable,
          balanceRaw: accruedReward,
        }
      },
    )

    if (rewards.length === 0) {
      return []
    }

    return [
      {
        type: TokenType.Protocol,
        balanceRaw: 1n, // choose 1 here as a zero value may cause the position to be ignored on UIs our adapters currently expecting a protocol token but on contract positions there is no token
        ...this.INCENTIVES_CONTRACT_DETAILS,
        tokens: rewards,
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
