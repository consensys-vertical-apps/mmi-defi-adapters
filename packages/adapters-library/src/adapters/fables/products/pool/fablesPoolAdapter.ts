import { Contract, getAddress } from 'ethers'
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
import { Protocol } from '../../../protocols'

/**
 * Fables Uniswap v4 ledger hooks on Robinhood Chain.
 * Validated via Blockscout contract names + on-chain ERC-6909 Transfer activity:
 * - FablesRampETH 0x06a889…6080
 * - FablesRamp     0x08e525…a080
 * - FablesRWA      0x5eb87f…e080
 * Sources: hoodscan / DefiLlama / fables.fi docs; registry 0x159a113e…ef3.
 */
const HOOK_ADDRESSES = {
  rampEth: getAddress('0x06a889870c8f83640d6816319f72e2aa579b6080'),
  ramp: getAddress('0x08e52564bad99e05a694b4809f397edca417a080'),
  rwa: getAddress('0x5eb87f69be00df39981622fd60a8de4b7837e080'),
} as const

/** Minimal ERC-6909 ledger surface used for position balances. */
const LEDGER_ABI = [
  'function balanceOf(address owner, uint256 id) view returns (uint256 amount)',
] as const

/**
 * Fables LP ledger positions (ERC-6909 receipts on Ramp / RampETH / RWA hooks).
 * Gates users via ERC-6909 Transfer (receiver + range id).
 */
export class FablesPoolAdapter implements IProtocolAdapter {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: {
      // ERC-6909 Transfer — not the ERC-20/721 Transfer topic used by userEvent: 'Transfer'
      eventAbi:
        'event Transfer(address caller, address indexed sender, address indexed receiver, uint256 indexed id, uint256 amount)',
      userAddressArgument: 'receiver',
      additionalMetadataArguments: {
        argumentName: 'id',
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Fables',
      description:
        'Fables ve(3,3) Uniswap v4 ledger LP positions on Robinhood Chain',
      siteUrl: 'https://www.fables.fi',
      iconUrl: 'https://www.fables.fi/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  /**
   * Returns the three validated Fables ledger hooks as protocol tokens.
   */
  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    // Step 1: Robinhood-only deployment
    if (this.chainId !== Chain.Robinhood) {
      throw new Error('Fables adapter only supports Robinhood Chain')
    }

    // Step 2: Static metadata (hooks are not ERC-20s)
    return [
      {
        address: HOOK_ADDRESSES.rampEth,
        name: 'Fables Ramp ETH Ledger',
        symbol: 'FABLES-RAMP-ETH',
        decimals: 0,
        underlyingTokens: [],
      },
      {
        address: HOOK_ADDRESSES.ramp,
        name: 'Fables Ramp Ledger',
        symbol: 'FABLES-RAMP',
        decimals: 0,
        underlyingTokens: [],
      },
      {
        address: HOOK_ADDRESSES.rwa,
        name: 'Fables RWA Ledger',
        symbol: 'FABLES-RWA',
        decimals: 0,
        underlyingTokens: [],
      },
    ]
  }

  /**
   * Reads ERC-6909 receipt balances for gated range ids on a hook.
   */
  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
    tokenIds,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    // Step 1: Positions are keyed by range id from Transfer metadata
    if (!tokenIds?.length) {
      return []
    }

    const protocolTokens = await this.getProtocolTokens()
    const hooks = protocolTokenAddresses?.length
      ? protocolTokens.filter((token) =>
          protocolTokenAddresses.includes(token.address),
        )
      : protocolTokens

    // Step 2: For each hook × range id, return non-zero receipt balances
    const positions: ProtocolPosition[] = []
    for (const hook of hooks) {
      const ledger = new Contract(hook.address, LEDGER_ABI, this.provider)
      const balanceOf = ledger.balanceOf

      // Step: Skip hook if the ledger ABI surface is missing balanceOf
      if (typeof balanceOf !== 'function') {
        console.error('Fables ledger missing balanceOf', {
          hook: hook.address,
        })
        continue
      }

      const hookPositions = await filterMapAsync(tokenIds, async (tokenId) => {
        try {
          // Step: Read ERC-6909 receipt balance for this range id
          const balanceRaw = (await balanceOf(userAddress, BigInt(tokenId), {
            blockTag: blockNumber,
          })) as bigint

          if (balanceRaw === 0n) {
            return undefined
          }

          return {
            address: hook.address,
            tokenId: tokenId.toString(),
            name: `${hook.name} #${tokenId}`,
            symbol: hook.symbol,
            decimals: hook.decimals,
            balanceRaw,
            type: TokenType.Protocol,
          } satisfies ProtocolPosition
        } catch (error) {
          console.error('Error reading Fables ledger balance:', {
            hook: hook.address,
            tokenId,
            error,
          })
          return undefined
        }
      })

      positions.push(...hookPositions)
    }

    return positions
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
