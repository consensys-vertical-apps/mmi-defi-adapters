import { Interface, getAddress, id, isAddress } from 'ethers'
import type { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import type { Helpers } from '../../../../core/helpers'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
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
} from '../../../../types/adapter'
import type { Protocol } from '../../../protocols'

export const DOT_VAULT = getAddress(
  '0x4032d83fb4a2b905259ae49abad1a1ac00635066',
)
export const DOT_TOKEN = getAddress(
  '0x23a2847d772803f9efc64b4277b782b06296fe51',
)
export const DOT_DEPLOYMENT_BLOCK = 52348946

// Exit IDs include withdrawn requests. Bound work before conversion/allocation,
// and fail explicitly rather than returning a silently incomplete position.
export const MAX_EXIT_REQUESTS = 1024n
const EXIT_BATCH_SIZE = 16

// View getters only. No signer, transaction builder, token approvals or minting.
export const DOT_VAULT_READ_ABI = [
  'function staked(address) view returns (uint256)',
  'function nextExitId(address) view returns (uint256)',
  'function exits(address,uint256) view returns (uint256 amount,uint256 readyAt)',
] as const
const vaultInterface = new Interface(DOT_VAULT_READ_ABI)

export class DotStakingAdapter implements IProtocolAdapter {
  productId = 'staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers
  adaptersController: AdaptersController
  private provider: CustomJsonRpcProvider

  adapterSettings: AdapterSettings = {
    // This vault is a contract position, not a transferable receipt token.
    includeInUnwrap: false,
    userEvent: {
      topic0: id('Staked(address,uint256)') as `0x${string}`,
      userAddressIndex: 1,
    },
  }

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    if (chainId !== Chain.Base || provider.chainId !== Chain.Base) {
      throw new Error('Dot staking is only supported on Base')
    }
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      chainId: this.chainId,
      productId: this.productId,
      name: 'Dot',
      description:
        'DOT staking principal, including pending withdrawals. Seven-day withdrawal cooldown. AI rewards are managed separately in the Dot app.',
      siteUrl: 'https://app.usedot.xyz/staking',
      iconUrl: 'https://app.usedot.xyz/dot-mark.png',
      positionType: PositionType.Staked,
    }
  }

  async getProtocolTokens(): Promise<ProtocolToken[]> {
    // Fixed metadata for one immutable Base vault; no metadata API or DB write.
    return [
      {
        address: DOT_VAULT,
        name: 'DOT staking (including pending withdrawals)',
        symbol: 'DOT',
        decimals: 18,
        underlyingTokens: [
          { address: DOT_TOKEN, name: 'Dot', symbol: 'DOT', decimals: 18 },
        ],
      },
    ]
  }

  private async read(
    method: 'staked' | 'nextExitId' | 'exits',
    args: (string | bigint)[],
    blockNumber: number,
  ) {
    const result = await this.provider.call({
      to: DOT_VAULT,
      data: vaultInterface.encodeFunctionData(method, args),
      blockTag: blockNumber,
    })
    return vaultInterface.decodeFunctionResult(method, result)
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    if (!isAddress(userAddress)) throw new Error('Invalid DOT staking address')
    if (
      protocolTokenAddresses &&
      !protocolTokenAddresses.some(
        (address) => address.toLowerCase() === DOT_VAULT.toLowerCase(),
      )
    )
      return []

    // Pin latest once, including for the shared provider's block-keyed call cache.
    const block = blockNumber ?? (await this.provider.getBlockNumber())
    if (!Number.isSafeInteger(block) || block < 0)
      throw new Error('Invalid DOT staking block number')
    if (block < DOT_DEPLOYMENT_BLOCK) return []

    const [[staked], [nextExitId]] = await Promise.all([
      this.read('staked', [userAddress], block),
      this.read('nextExitId', [userAddress], block),
    ])
    if (nextExitId > MAX_EXIT_REQUESTS) {
      throw new Error(
        'DOT exit history exceeds the read budget; complete position unavailable',
      )
    }
    let pending = 0n
    for (let start = 0; start < Number(nextExitId); start += EXIT_BATCH_SIZE) {
      const count = Math.min(EXIT_BATCH_SIZE, Number(nextExitId) - start)
      const exits = await Promise.all(
        Array.from({ length: count }, (_, offset) =>
          this.read('exits', [userAddress, BigInt(start + offset)], block),
        ),
      )
      // Matured exits count until withdrawPrincipal deletes them. RPC failures
      // propagate: an unknown exit must never be reported as a zero balance.
      for (const [amount] of exits) pending += amount
    }
    const balanceRaw: bigint = staked + pending
    if (balanceRaw === 0n) return []
    const [protocolToken] = await this.getProtocolTokens()
    return [
      {
        address: protocolToken!.address,
        name: protocolToken!.name,
        symbol: protocolToken!.symbol,
        decimals: protocolToken!.decimals,
        balanceRaw,
        type: TokenType.Protocol,
        tokens: protocolToken!.underlyingTokens.map((token) => ({
          ...token,
          balanceRaw,
          type: TokenType.Underlying,
        })),
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    if (protocolTokenAddress.toLowerCase() !== DOT_VAULT.toLowerCase())
      throw new Error('Unknown DOT staking position')
    const [protocolToken] = await this.getProtocolTokens()
    return {
      address: protocolToken!.address,
      name: protocolToken!.name,
      symbol: protocolToken!.symbol,
      decimals: protocolToken!.decimals,
      type: TokenType.Protocol,
      baseRate: 1,
      tokens: protocolToken!.underlyingTokens.map((token) => ({
        ...token,
        type: TokenType.Underlying,
        underlyingRateRaw: 10n ** 18n,
      })),
    }
  }
}
