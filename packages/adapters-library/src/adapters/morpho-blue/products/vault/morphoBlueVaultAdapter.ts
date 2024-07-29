import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { Replacements } from '../../../../scripts/replacements'
import { RewardsAdapter } from '../../../../scripts/rewardAdapter'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { Metamorpho__factory, Metamorphofactory__factory } from '../../contracts'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { DepositEvent } from '../../contracts/Metamorpho'
import { TypedContractEvent, TypedDeferredTopicFilter } from '../../contracts/common'

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

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
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

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
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

    const protocolToken = await this._fetchVaultMetadata(metaMorphoVault)
    const underlyingToken = await this._fetchUnderlyingTokenMetadata(metaMorphoVault)
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

        return {
          protocolToken,
          tokens: [
            {
              ...underlyingToken!,
              balanceRaw: eventData.assets,
              type: TokenType.Underlying,
            },
          ],
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }
      }),
    )

    return movements
  }

  private async _fetchVaultMetadata(vaultAddress: string): Promise<Erc20Metadata> {
    const vaults = await this.getProtocolTokens()
    const vaultMetadata = vaults.find(
      (vault) => vault.address.toLowerCase() === vaultAddress.toLowerCase(),
    )
    if (!vaultMetadata) {
      logger.error({ vaultAddress }, 'Token metadata not found')
      throw new Error('Token metadata not found')
    }
    return vaultMetadata
  }

  private async _fetchUnderlyingTokenMetadata(vaultAddress: string): Promise<Erc20Metadata> {
    const vaults = await this.getProtocolTokens()
    const vaultMetadata = vaults.find(
      (vault) => vault.address.toLowerCase() === vaultAddress.toLowerCase(),
    )
    if (!vaultMetadata) {
      logger.error({ vaultAddress }, 'Token metadata not found')
      throw new Error('Token metadata not found')
    }
    return vaultMetadata
  }

}