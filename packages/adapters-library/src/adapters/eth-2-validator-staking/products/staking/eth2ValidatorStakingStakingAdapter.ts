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

// Alchemy API configuration
const BEACON_NODE_API_KEY = 'e47c37f60c640ea5e3cd515b5140eafac797e036'
const BEACON_BASE_URL = 'https://bold-green-shard.quiknode.pro'

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
   * Fetch validator data from Alchemy beacon node API
   */
  private async fetchValidatorData(
    pubkey: string[],
  ): Promise<ValidatorData[] | null> {
    try {
      const baseUrl = `${BEACON_BASE_URL}/${BEACON_NODE_API_KEY}/eth/v1/beacon/states/head/validators`

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

      console.log('Response:', JSON.stringify(data, null, 2))

      return data.data
    } catch (error) {
      logger.error('Error fetching validator data:', error)
      return null
    }
  }

  async getPositions({
    tokenIds: userPubkeys, // bit of a hack to use tokenIds as userPubkeys
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    if (!userPubkeys || !userPubkeys.length) {
      return []
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

    return [
      {
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
      },
    ]
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
