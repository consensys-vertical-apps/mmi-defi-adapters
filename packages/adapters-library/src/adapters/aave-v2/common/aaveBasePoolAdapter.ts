import { getAddress } from 'ethers'
import { AdaptersController } from '../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../core/constants/chains'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../core/utils/filters'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter'
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
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  ProtocolDataProvider,
  ProtocolDataProvider__factory,
} from '../contracts'

export const protocolDataProviderContractAddresses: Partial<
  Record<
    Protocol,
    Partial<
      Record<
        Chain,
        {
          marketLabel?: string
          protocolDataProvider: string
        }[]
      >
    >
  >
> = {
  [Protocol.AaveV2]: {
    [Chain.Ethereum]: [
      {
        protocolDataProvider: getAddress(
          '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
        ),
      },
    ],
    [Chain.Polygon]: [
      {
        protocolDataProvider: getAddress(
          '0x7551b5D2763519d4e37e8B81929D336De671d46d',
        ),
      },
    ],
    [Chain.Avalanche]: [
      {
        protocolDataProvider: getAddress(
          '0x65285E9dfab318f57051ab2b139ccCf232945451',
        ),
      },
    ],
  },
  [Protocol.AaveV3]: {
    [Chain.Ethereum]: [
      {
        protocolDataProvider: getAddress(
          '0x41393e5e337606dc3821075Af65AeE84D7688CBD',
        ),
      },
      {
        marketLabel: 'Lido Market',
        protocolDataProvider: getAddress(
          '0x08795CFE08C7a81dCDFf482BbAAF474B240f31cD',
        ),
      },
      {
        marketLabel: 'EtherFi Market',
        protocolDataProvider: getAddress(
          '0xE7d490885A68f00d9886508DF281D67263ed5758',
        ),
      },
    ],
    [Chain.Optimism]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
      },
    ],
    [Chain.Arbitrum]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
      },
    ],
    [Chain.Polygon]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
      },
    ],
    [Chain.Fantom]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
      },
    ],
    [Chain.Avalanche]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
      },
    ],
    [Chain.Base]: [
      {
        protocolDataProvider: getAddress(
          '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
        ),
      },
    ],
    [Chain.Bsc]: [
      {
        protocolDataProvider: getAddress(
          '0x23dF2a19384231aFD114b036C14b6b03324D79BC',
        ),
      },
    ],
  },
}

export abstract class AaveBasePoolAdapter implements IProtocolAdapter {
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

  async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvlUsingUnderlyingTokenBalances({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const dataProviderEntry =
      protocolDataProviderContractAddresses[this.protocolId]![this.chainId]!

    const factories = Array.isArray(dataProviderEntry)
      ? dataProviderEntry
      : [{ protocolDataProvider: dataProviderEntry, marketLabel: undefined }]

    return (
      await Promise.all(
        factories.map(async ({ protocolDataProvider, marketLabel }) => {
          const protocolDataProviderContract =
            ProtocolDataProvider__factory.connect(
              protocolDataProvider,
              this.provider,
            )

          const reserveTokens =
            await protocolDataProviderContract.getAllReservesTokens()

          return await filterMapAsync(
            reserveTokens,
            async ({ tokenAddress }) => {
              const reserveTokenAddresses =
                await protocolDataProviderContract.getReserveTokensAddresses(
                  tokenAddress,
                )

              const [protocolToken, underlyingToken] = await Promise.all([
                this.helpers.getTokenMetadata(
                  this.getReserveTokenAddress(reserveTokenAddresses),
                ),
                this.helpers.getTokenMetadata(tokenAddress),
              ])

              if (protocolToken.address === ZERO_ADDRESS) {
                return undefined
              }

              return {
                ...protocolToken,
                name: `${protocolToken.name}${
                  marketLabel ? ` (${marketLabel})` : ''
                }`,
                underlyingTokens: [underlyingToken],
              }
            },
          )
        }),
      )
    ).flat()
  }

  protected async getProtocolToken(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { name, symbol, decimals, address } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return { name, symbol, decimals, address }
  }

  protected async getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

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
}
