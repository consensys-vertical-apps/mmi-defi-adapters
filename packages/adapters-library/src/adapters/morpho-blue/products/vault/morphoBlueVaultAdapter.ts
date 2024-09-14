import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
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
  MetamorphoFactory__factory,
  Metamorpho__factory,
} from '../../contracts'

export type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
}

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

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
    version: 2,
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

  @CacheToFile({ fileKey: 'protocol-token' })
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const metaMorphoFactoryContract = MetamorphoFactory__factory.connect(
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

    const metadata: ProtocolToken<AdditionalMetadata>[] = []

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

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()
    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
        protocolToken.address,
      )

      const protocolTokenContact = Metamorpho__factory.connect(
        protocolToken.address,
        this.provider,
      )

      const protocolTokenTotalAsset = await protocolTokenContact.totalAssets({
        blockTag: blockNumber,
      })

      return {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: underlyingToken!.symbol,
        decimals: underlyingToken!.decimals,
        type: TokenType.Protocol,
        totalSupplyRaw: protocolTokenTotalAsset,
      }
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(
        protocolTokenAddress,
      ),
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
      await this.helpers.getProtocolTokenByAddress<AdditionalMetadata>({
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
    const { underlyingTokens } =
      await this.helpers.getProtocolTokenByAddress<AdditionalMetadata>({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      })

    return underlyingTokens!
  }
}
