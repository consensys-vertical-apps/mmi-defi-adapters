import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
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
import { Metamorpho__factory, Metamorphofactory__factory } from '../../contracts'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { TypedContractEvent, TypedDeferredTopicFilter } from '../../contracts/common'
import { Erc20__factory } from '../../../../contracts'
import { filterMapAsync } from '../../../../core/utils/filters'

type MetaMorphoVaultMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

const metaMorphoFactoryContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoBlue]: {
    [Chain.Ethereum]: '0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101',
    [Chain.Base]: '0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101',
  },
}

export class MorphoBlueVaultAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'vault'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
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
  async buildMetadata(): Promise<MetaMorphoVaultMetadata> {
    const metaMorphoFactoryContract = Metamorphofactory__factory.connect(
      metaMorphoFactoryContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )
    const createMetaMorphoFilter = metaMorphoFactoryContract.filters.CreateMetaMorpho()

    const metaMorphoVaults = (
      await metaMorphoFactoryContract.queryFilter(createMetaMorphoFilter, 0, 'latest')
    ).map((event) => ({
      vault: event.args[0],
      underlyingAsset: event.args[4]
    }))

    const metadataObject: MetaMorphoVaultMetadata = {}

    await Promise.all(
      metaMorphoVaults.map(async ({ vault, underlyingAsset }) => {
        const [vaultData, underlyingTokenData] = await Promise.all([
          getTokenMetadata(
            vault,
            this.chainId,
            this.provider,
          ),
          getTokenMetadata(
            underlyingAsset,
            this.chainId,
            this.provider,
          ),
        ])

        metadataObject[vault] = {
          protocolToken: vaultData,
          underlyingToken: underlyingTokenData,
        }
      }),
    )

    return metadataObject
  }

  async getProtocolTokens(): Promise<(Erc20Metadata)[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()
    const filteredTokens = protocolTokenAddresses
      ? protocolTokens.filter(token => 
          protocolTokenAddresses.map(addr => addr.toLowerCase())
            .includes(token.address.toLowerCase())
        )
      : protocolTokens
  
    const positions: ProtocolPosition[] = []
  
    await Promise.all(
      filteredTokens.map(async (protocolToken) => {
        const underlyingToken = await this.getUnderlyingToken(protocolToken.address);
        const metaMorphoContract = Metamorpho__factory.connect(
          protocolToken.address,
          this.provider
        )
        const underlyingAssetContract = Erc20__factory.connect(
          underlyingToken.address,
          this.provider
        )
  
        const[balanceRaw, vaultDecimal, assetDecimals] = await Promise.all([
          metaMorphoContract.balanceOf(userAddress, { blockTag: blockNumber }),
          metaMorphoContract.decimals(),
          underlyingAssetContract.decimals()
        ])


        
        if (balanceRaw > 0n) {
          const underlyingToken = await this.getUnderlyingToken(protocolToken.address)
  
          positions.push({
            tokenId: protocolToken.address,
            ...protocolToken,
            balanceRaw,
            type: TokenType.Protocol,
            tokens: [
              {
                ...underlyingToken,
                balanceRaw: balanceRaw / 10n ** (vaultDecimal - assetDecimals),
                type: TokenType.Underlying,
              },
            ],
          })
        }
      })
    )
  
    return positions
  }

  async getWithdrawals({
    userAddress,
    fromBlock,
    toBlock,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return (
      await Promise.all([
        this.getMovements({
          userAddress,
          fromBlock,
          toBlock,
          eventType: 'withdraw',
          metaMorphoVault: protocolTokenAddress,
        })
      ])
    ).flat()
  }

  async getDeposits({
    userAddress,
    fromBlock,
    toBlock,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return (
      await Promise.all([
        this.getMovements({
          userAddress,
          fromBlock,
          toBlock,
          eventType: 'deposit',
          metaMorphoVault: protocolTokenAddress,
        })
      ])
    ).flat()
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

      const underlyingToken = await this.getUnderlyingToken(protocolToken.address)

      const protocolTokenContact = Metamorpho__factory.connect(
        protocolToken.address,
        this.provider,
      )

      const protocolTokenTotalAsset = await 
        protocolTokenContact.totalAssets({
          blockTag: blockNumber,
        })
      

      return {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: underlyingToken.symbol,
        decimals: underlyingToken.decimals,
        type: TokenType.Protocol,
        totalSupplyRaw: protocolTokenTotalAsset,
      }
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolToken = await this.getProtocolToken(protocolTokenAddress);
    const underlyingToken = await this.getUnderlyingToken(protocolTokenAddress);
    
    return this.helpers.unwrapOneToOne({
      protocolToken: protocolToken,
      underlyingTokens: [underlyingToken], // Wrap the single underlying token in an array
    });
  }

  private async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }
  private async getUnderlyingToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).underlyingToken
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  private async getMovements({
    userAddress,
    fromBlock,
    toBlock,
    eventType,
    metaMorphoVault,
  }: {
    userAddress: string

    fromBlock: number
    toBlock: number
    eventType: 'deposit' | 'withdraw'
    metaMorphoVault: string
  }): Promise<MovementsByBlock[]> {

    const metaMorphoContract = Metamorpho__factory.connect(
      metaMorphoVault,
      this.provider,
    )

    const [protocolToken, underlyingToken] = await Promise.all(
      [
      this.getProtocolToken(metaMorphoVault), 
      this.getUnderlyingToken(metaMorphoVault)
    ]
    )
    let filter: TypedDeferredTopicFilter<TypedContractEvent<any, any, any>>

    switch (eventType) {
      case 'deposit':
        filter = metaMorphoContract.filters.Deposit(undefined, userAddress)
        break
      case 'withdraw':
        filter = metaMorphoContract.filters.Withdraw(undefined, undefined, userAddress)
        break
    }


    const eventResults = await metaMorphoContract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    const movements = await Promise.all(
      eventResults.map(async (event) => {
        const eventData = event.args
        let balanceRaw = eventData.assets 
        return {
          protocolToken,
          tokens: [
            {
              ...underlyingToken!,
              balanceRaw : Number(balanceRaw),
              type: TokenType.Underlying,
            },
          ],
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }
      }),
    )

    return movements.map(movement => ({
      ...movement,
      tokens: movement.tokens.map(token => ({
        ...token,
        balanceRaw: BigInt(token.balanceRaw)
      }))
    }))
  }

}