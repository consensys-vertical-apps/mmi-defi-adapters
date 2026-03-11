import { getAddress, id } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
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
import { OkBitokVault__factory } from '../../contracts'

const DEPOSITED_EVENT_TOPIC0 = id(
  'Deposited(address,uint256,uint256)',
) as `0x${string}`

const VAULT_METADATA = {
  name: 'OK-BITOK Vault',
  symbol: 'OK-BITOK',
  decimals: 6,
} as const

const vaultAddresses: Partial<Record<Chain, string>> = {
  [Chain.Arbitrum]: '0xD772A28caf98cCF3c774c704cA9514A4914b50A0',
}

const underlyingAddresses: Partial<Record<Chain, string>> = {
  [Chain.Arbitrum]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
}

const underlyingMetadataByChain: Partial<
  Record<
    Chain,
    {
      address: string
      name: string
      symbol: string
      decimals: number
    }
  >
> = {
  [Chain.Arbitrum]: {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
  },
}

export class OkBitokVaultAdapter implements IProtocolAdapter {
  productId = 'vault'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: {
      topic0: DEPOSITED_EVENT_TOPIC0,
      userAddressIndex: 1,
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
      name: 'OK-BITOK Vault',
      description: 'OK-BITOK vault adapter',
      siteUrl: 'https://ok-bitok.com/',
      iconUrl: 'https://ok-bitok.com/logo.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const vaultAddress = vaultAddresses[this.chainId]
    if (!vaultAddress) {
      return []
    }

    const normalizedVaultAddress = getAddress(vaultAddress)
    const vaultContract = OkBitokVault__factory.connect(
      normalizedVaultAddress,
      this.provider,
    )

    const underlyingAddress = underlyingAddresses[this.chainId]
    if (!underlyingAddress) {
      throw new Error(`Underlying token missing for chain ${this.chainId}`)
    }

    const underlyingToken = await this.helpers.getTokenMetadata(
      underlyingAddress,
    )

    return [
      {
        address: vaultContract.target.toString(),
        ...VAULT_METADATA,
        underlyingTokens: [underlyingToken],
      },
    ]
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const vaultAddress = vaultAddresses[this.chainId]
    if (!vaultAddress) {
      return []
    }

    const normalizedVaultAddress = getAddress(vaultAddress)

    if (
      protocolTokenAddresses &&
      !protocolTokenAddresses
        .map((address) => getAddress(address))
        .includes(normalizedVaultAddress)
    ) {
      return []
    }

    const underlyingMetadata = underlyingMetadataByChain[this.chainId]
    if (!underlyingMetadata) {
      throw new Error(
        `Underlying token metadata missing for chain ${this.chainId}`,
      )
    }

    const protocolToken: ProtocolToken = {
      address: normalizedVaultAddress,
      ...VAULT_METADATA,
      underlyingTokens: [
        {
          address: getAddress(underlyingMetadata.address),
          name: underlyingMetadata.name,
          symbol: underlyingMetadata.symbol,
          decimals: underlyingMetadata.decimals,
        },
      ],
    }

    const vaultContract = OkBitokVault__factory.connect(
      normalizedVaultAddress,
      this.provider,
    )

    const shareBalance = await vaultContract.balanceOf(userAddress, {
      blockTag: blockNumber,
    })

    if (shareBalance === 0n) {
      return []
    }

    return [
      {
        ...protocolToken,
        balanceRaw: shareBalance,
        type: TokenType.Protocol,
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolToken = await this.getProtocolTokenByAddress(
      protocolTokenAddress,
    )

    const vaultContract = OkBitokVault__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const navPerShare = await vaultContract.nav({ blockTag: blockNumber })
    const underlyingToken = protocolToken.underlyingTokens?.[0]

    if (!underlyingToken) {
      throw new Error('Missing underlying token metadata')
    }

    const navDecimals = 18n
    const underlyingRateRaw =
      (navPerShare * 10n ** BigInt(underlyingToken.decimals)) /
      10n ** navDecimals

    return this.helpers.unwrapTokenWithRates({
      protocolToken,
      underlyingTokens: protocolToken.underlyingTokens ?? [],
      underlyingRates: [underlyingRateRaw],
    })
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress?: string,
  ): Promise<ProtocolToken> {
    const protocolTokens = await this.getProtocolTokens()

    if (protocolTokenAddress) {
      return this.helpers.getProtocolTokenByAddress({
        protocolTokens,
        protocolTokenAddress,
      })
    }

    const protocolToken = protocolTokens[0]
    if (!protocolToken) {
      throw new Error(`Protocol token missing for chain ${this.chainId}`)
    }

    return protocolToken
  }
}
