import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
  Metamorpho__factory,
  Metamorphofactory__factory,
} from '../../contracts'

const metaMorphoFactoryContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoBlue]: {
    [Chain.Ethereum]: '0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101',
    [Chain.Base]: '0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101',
  },
}

export class MorphoBlueVaultAdapter implements IProtocolAdapter {
  productId = 'vault'
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
      name: 'MetaMorpho Vaults',
      description: 'MetaMorpho Vaults adapter',
      siteUrl: 'https://app.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const metaMorphoFactoryContract = Metamorphofactory__factory.connect(
      metaMorphoFactoryContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )
    const createMetaMorphoFilter =
      metaMorphoFactoryContract.filters.CreateMetaMorpho()

    const metaMorphoVaults = (
      await metaMorphoFactoryContract.queryFilter(
        createMetaMorphoFilter,
        0,
        'latest',
      )
    ).map((event) => ({
      vault: event.args[0],
      underlyingAsset: event.args[4],
    }))

    const metadata: ProtocolToken[] = []

    await Promise.all(
      metaMorphoVaults.map(async ({ vault, underlyingAsset }) => {
        const [vaultData, underlyingTokenData] = await Promise.all([
          getTokenMetadata(vault, this.chainId, this.provider),
          getTokenMetadata(underlyingAsset, this.chainId, this.provider),
        ])

        metadata.push({
          ...vaultData,
          underlyingTokens: [underlyingTokenData],
        })
      }),
    )

    return metadata
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken:
        await this.fetchProtocolTokenMetadata(protocolTokenAddress),
      underlyingTokens:
        await this.fetchUnderlyingTokensMetadata(protocolTokenAddress),
    })
  }

  /**
   * Fetches the protocol-token metadata
   * @param protocolTokenAddress
   */
  private async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { address, name, decimals, symbol } =
      await this.helpers.getProtocolTokenByAddress({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      })

    return { address, name, decimals, symbol }
  }

  /**
   * Fetches the protocol-token's underlying token details
   * @param protocolTokenAddress
   */
  private async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } = await this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })

    return underlyingTokens!
  }
}
