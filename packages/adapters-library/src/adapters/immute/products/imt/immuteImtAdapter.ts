import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import {
  Erc20ExtendedMetadata,
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  GetRewardPositionsInput,
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
import { ImmuteV8__factory } from '../../contracts'

/**
 * Immute IMT (`ImmuteV8`) on Ethereum mainnet.
 * Source verified on Etherscan, Sourcify (exact match) and Blockscout.
 */
const IMT_TOKEN_ADDRESS = getAddress(
  '0xDCfDC48c941561d7ec5E819834e6D99A0c838Dd3',
)

type AdditionalMetadata = {
  rewardTokens: Erc20ExtendedMetadata[]
}

/**
 * Read-only adapter for IMT holders.
 *
 * All values are read on-chain from the IMT token contract:
 * - Protocol token balance: `balanceOf(user)`
 * - Underlying ETH: `calculateEthReceived(balance)`, the contract's own quote
 *   for selling the whole balance against its bonding-curve reserve, net of
 *   the contract's 10% sell fee.
 * - Claimable ETH: `myDividends(true)` called with `from = user`, which is the
 *   accrued holder-fee share plus any referral balance (the amount that
 *   `withdraw()` would pay out).
 */
export class ImmuteImtAdapter implements IProtocolAdapter {
  productId = 'imt'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
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
      name: 'Immute',
      description:
        'Immute (IMT) bonding-curve token on Ethereum mainnet. Shows IMT balance, the contract sell quote in ETH (net of the 10% sell fee) and ETH claimable from accrued fee distributions',
      siteUrl: 'https://immute.io/',
      iconUrl: 'https://immute.io/icon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    if (this.chainId !== Chain.Ethereum) {
      throw new Error('Immute adapter only supports Ethereum mainnet')
    }

    const [protocolToken, ethToken] = await Promise.all([
      this.helpers.getTokenMetadata(IMT_TOKEN_ADDRESS),
      this.helpers.getTokenMetadata(ZERO_ADDRESS),
    ])

    return [
      {
        ...protocolToken,
        underlyingTokens: [ethToken],
        rewardTokens: [ethToken],
      },
    ]
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    return filterMapAsync(
      protocolTokens,
      async ({ underlyingTokens, rewardTokens: _, ...protocolToken }) => {
        if (
          protocolTokenAddresses &&
          !protocolTokenAddresses.includes(protocolToken.address)
        ) {
          return undefined
        }

        const contract = ImmuteV8__factory.connect(
          protocolToken.address,
          this.provider,
        )

        const balanceRaw = await contract.balanceOf(userAddress, {
          blockTag: blockNumber,
        })

        if (balanceRaw === 0n) {
          return undefined
        }

        // Contract quote for redeeming the full balance, net of the 10% sell fee
        const ethReceivedRaw = await contract.calculateEthReceived(balanceRaw, {
          blockTag: blockNumber,
        })

        return {
          ...protocolToken,
          type: TokenType.Protocol,
          balanceRaw,
          tokens: [
            {
              ...underlyingTokens[0]!,
              type: TokenType.Underlying,
              balanceRaw: ethReceivedRaw,
            },
          ],
        }
      },
    )
  }

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { address, rewardTokens } = this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })

    const contract = ImmuteV8__factory.connect(address, this.provider)

    // myDividends(true) = dividendsOf(user) + referral balance, as paid by withdraw().
    // It reads msg.sender, so it is called with `from = user` (plain eth_call).
    const claimableRaw = await contract.myDividends(true, {
      from: userAddress,
      blockTag: blockNumber,
    })

    if (claimableRaw === 0n) {
      return []
    }

    return [
      {
        ...rewardTokens[0]!,
        type: TokenType.UnderlyingClaimable,
        balanceRaw: claimableRaw,
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const {
      underlyingTokens,
      rewardTokens: _,
      ...protocolToken
    } = this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })

    const contract = ImmuteV8__factory.connect(
      protocolToken.address,
      this.provider,
    )

    // Indicative on-chain sell price of one IMT in ETH, net of the 10% sell fee
    const sellPriceRaw = await contract.sellPrice({ blockTag: blockNumber })

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingTokens[0]!,
          type: TokenType.Underlying,
          underlyingRateRaw: sellPriceRaw,
        },
      ],
    }
  }
}
