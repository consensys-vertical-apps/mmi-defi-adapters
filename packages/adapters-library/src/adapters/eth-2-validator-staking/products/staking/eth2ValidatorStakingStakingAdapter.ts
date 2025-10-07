import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
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

/**
 * ETH2 Validator Staking Adapter
 * Queries beacon node API for validator information
 */

// Cache entry interface for standardized validator positions
interface CacheEntry {
  position: ProtocolPosition
  timestamp: number
}

// Alchemy Beacon Node API types
interface ValidatorData {
  index: string
  balance: string
  status: string
  validator: {
    pubkey: string
    withdrawal_credentials: string
    effective_balance: string
    slashed: boolean
    activation_eligibility_epoch: string
    activation_epoch: string
    exit_epoch: string
    withdrawable_epoch: string
  }
}

interface ValidatorResponse {
  execution_optimistic: boolean
  finalized: boolean
  data: ValidatorData[]
}

export class Eth2ValidatorStakingStakingAdapter implements IProtocolAdapter {
  productId = 'staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers
  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: {
      eventAbi:
        'event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)',
      userAddressArgument: 'withdrawal_credentials',
      transformUserAddressType: 'eth2-withdrawal-credentials',
      additionalMetadataArguments: {
        argumentName: 'pubkey',
        transformMetadataType: undefined,
      },
    },
  }

  private provider: CustomJsonRpcProvider

  // 24-hour in-memory cache for standardized positions to protect API credits
  private positionCache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
  private lastCacheCleanup = 0
  private readonly CACHE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // Clean up every hour

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

  /**
   * ETH2 Validator Staking protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ETH2 Validator Staking',
      description:
        'Ethereum 2.0 validator staking positions via Alchemy beacon node API',
      siteUrl: 'https://ethereum.org/en/staking/',
      iconUrl:
        'https://ethereum.org/static/6b935ac0e6194247347855dc3d328e83/6ed5f/eth-diamond-black.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const underlyingToken = await this.helpers.getTokenMetadata(
      '0x0000000000000000000000000000000000000000',
    ) // ETH
    return [
      {
        address: getAddress('0x00000000219ab540356cBB839Cbe05303d7705Fa'),
        name: 'ETH2 Validator Staking',
        symbol: 'ETH2-VALIDATOR',
        decimals: 18,
        underlyingTokens: [underlyingToken],
      },
    ]
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  /**
   * Fetch validator data from beacon node API with 24-hour caching
   */
  private async fetchValidatorData(
    pubkey: string[],
  ): Promise<ValidatorData[] | null> {
    try {
      const baseUrl = `${this.helpers.config.beaconBaseUrl}/${this.helpers.config.beaconNodeApiKey}/eth/v1/beacon/states/head/validators`

      const url = new URL(baseUrl)
      url.searchParams.set('id', pubkey.join(','))

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      })

      if (!response.ok) {
        logger.error(
          `Failed to fetch validator data: ${response.status} ${response.statusText}`,
        )
        return null
      }

      const data: ValidatorResponse = await response.json()

      return data.data
    } catch (error) {
      logger.error('Error fetching validator data:', error)
      return null
    }
  }

  /**
   * Clear expired cache entries to prevent memory leaks
   */
  private clearExpiredCache(): void {
    const now = Date.now()

    for (const [key, entry] of this.positionCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_DURATION_MS) {
        this.positionCache.delete(key)
      }
    }
  }

  async getPositions({
    tokenIds: userPubkeys, // bit of a hack to use tokenIds as userPubkeys
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    if (!userPubkeys || !userPubkeys.length) {
      return []
    }

    if (userPubkeys.length > 100) {
      // For V1 we will return here to protect API credits
      // only staking providers like coinbase and lido likely to have more than 100 validators and they are not our target user
      // We can review this decision in future perhaps when we have switched from Quicknode to an internal beacon node api
      return []
    }

    // Create cache key from sorted pubkeys to ensure consistency
    const cacheKey = userPubkeys.sort().join(',')
    const now = Date.now()

    // Check if we have cached position that's still valid
    const cachedEntry = this.positionCache.get(cacheKey)
    if (cachedEntry && now - cachedEntry.timestamp < this.CACHE_DURATION_MS) {
      return [cachedEntry.position]
    }

    // Clean up expired cache entries periodically (only every hour to avoid performance impact)
    if (now - this.lastCacheCleanup > this.CACHE_CLEANUP_INTERVAL_MS) {
      this.clearExpiredCache()
      this.lastCacheCleanup = now
    }

    const validatorData = await this.fetchValidatorData(userPubkeys)

    if (!validatorData) {
      return []
    }

    // Convert balance from gwei to wei (1 ETH = 10^18 wei, 1 ETH = 10^9 gwei)
    const balanceInGwei = BigInt(
      validatorData.reduce(
        (acc, curr) => acc + BigInt(curr.balance),
        BigInt(0),
      ),
    )
    const balanceInWei = balanceInGwei * BigInt(10 ** 9) // Convert gwei to wei

    const protocolTokens = await this.getProtocolTokens()
    const protocolToken = protocolTokens[0]!

    const position: ProtocolPosition = {
      address: protocolToken.address,
      name: 'ETH2 Validator Staking',
      symbol: protocolToken.symbol,
      decimals: protocolToken.decimals,
      balanceRaw: balanceInWei,
      type: TokenType.Protocol,
      tokens: protocolToken.underlyingTokens.map((token) => ({
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        balanceRaw: balanceInWei,
        type: TokenType.Underlying,
      })),
    }

    // Cache the standardized position for 24 hours
    this.positionCache.set(cacheKey, {
      position,
      timestamp: now,
    })
    return [position]
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
    })
  }
}
