import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../core/adapters/SimplePoolAdapter'
import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { logger } from '../../../core/utils/logger'
import { Helpers } from '../../../scripts/helpers'
import { IProtocolAdapter } from '../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
  UnwrappedTokenExchangeRate,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  ProtocolDataProvider,
  ProtocolDataProvider__factory,
} from '../contracts'

type AaveV2PoolMetadata = Record<
  string,
  Erc20Metadata & {
    underlyingTokens: Erc20Metadata[]
  }
>

const protocolDataProviderContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.AaveV2]: {
    [Chain.Ethereum]: getAddress('0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d'),
    [Chain.Polygon]: getAddress('0x7551b5D2763519d4e37e8B81929D336De671d46d'),
    [Chain.Avalanche]: getAddress('0x65285E9dfab318f57051ab2b139ccCf232945451'),
  },
  [Protocol.AaveV3]: {
    [Chain.Ethereum]: getAddress('0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3'),
    [Chain.Optimism]: getAddress('0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'),
    [Chain.Arbitrum]: getAddress('0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'),
    [Chain.Polygon]: getAddress('0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'),
    [Chain.Fantom]: getAddress('0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'),
    [Chain.Avalanche]: getAddress('0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'),
    [Chain.Base]: getAddress('0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'),
  },
}

export abstract class AaveBasePoolAdapter
  implements IMetadataBuilder, IProtocolAdapter
{
  chainId: Chain
  protocolId: Protocol
  abstract productId: string
  helpers: Helpers

  protected provider: CustomJsonRpcProvider

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

  abstract adapterSettings: AdapterSettings

  abstract getProtocolDetails(): ProtocolDetails

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
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
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.borrows({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getRepays({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.repays({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = Object.values(await this.buildMetadata())

    return await this.helpers.tvlUsingUnderlyingTokenBalances({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ name, symbol, decimals, address }) => ({
        name,
        symbol,
        decimals,
        address,
      }),
    )
  }

  async buildMetadata() {
    const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
      protocolDataProviderContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const reserveTokens =
      await protocolDataProviderContract.getAllReservesTokens()

    const metadataObject: AaveV2PoolMetadata = {}

    const promises = reserveTokens.map(async ({ tokenAddress }) => {
      const reserveConfigurationData =
        await protocolDataProviderContract.getReserveConfigurationData(
          tokenAddress,
        )

      if (
        !reserveConfigurationData.isActive ||
        reserveConfigurationData.isFrozen
      ) {
        return
      }

      const reserveTokenAddresses =
        await protocolDataProviderContract.getReserveTokensAddresses(
          tokenAddress,
        )

      const protocolTokenPromise = getTokenMetadata(
        this.getReserveTokenAddress(reserveTokenAddresses),
        this.chainId,
        this.provider,
      )
      const underlyingTokenPromise = getTokenMetadata(
        tokenAddress,
        this.chainId,
        this.provider,
      )

      const [protocolToken, underlyingToken] = await Promise.all([
        protocolTokenPromise,
        underlyingTokenPromise,
      ])

      metadataObject[protocolToken.address] = {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      }
    })

    await Promise.all(promises)

    return metadataObject
  }

  protected async getProtocolToken(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { name, symbol, decimals, address } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return { name, symbol, decimals, address }
  }

  protected async getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return underlyingTokens
  }

  protected abstract getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string

  protected abstract getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint

  async fetchPoolMetadata(protocolTokenAddress: string) {
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
}
