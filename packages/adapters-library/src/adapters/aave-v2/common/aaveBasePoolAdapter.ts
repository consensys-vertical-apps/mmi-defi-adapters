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

export const protocolContractAddresses: Partial<
  Record<
    Protocol,
    Partial<
      Record<
        Chain,
        {
          marketLabel?: string
          protocolDataProvider: string
          incentivesController: string
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
        incentivesController: getAddress(
          '0xd784927ff2f95ba542bfc824c8a8a98f3495f6b5',
        ),
      },
    ],
    [Chain.Polygon]: [
      {
        protocolDataProvider: getAddress(
          '0x7551b5D2763519d4e37e8B81929D336De671d46d',
        ),
        incentivesController: getAddress(
          '0x357D51124f59836DeD84c8a1730D72B749d8BC23',
        ),
      },
    ],
    [Chain.Avalanche]: [
      {
        protocolDataProvider: getAddress(
          '0x65285E9dfab318f57051ab2b139ccCf232945451',
        ),
        incentivesController: getAddress(
          '0x01D83Fe6A10D2f2B7AF17034343746188272cAc9',
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
        incentivesController: getAddress(
          '0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb',
        ),
      },
      {
        marketLabel: 'Lido Market',
        protocolDataProvider: getAddress(
          '0x08795CFE08C7a81dCDFf482BbAAF474B240f31cD',
        ),
        incentivesController: getAddress(
          '0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb',
        ),
      },
      {
        marketLabel: 'EtherFi Market',
        protocolDataProvider: getAddress(
          '0xE7d490885A68f00d9886508DF281D67263ed5758',
        ),
        incentivesController: getAddress(
          '0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb',
        ),
      },
    ],
    [Chain.Optimism]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
        incentivesController: getAddress(
          '0x929EC64c34a17401F460460D4B9390518E5B473e',
        ),
      },
    ],
    [Chain.Arbitrum]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
        incentivesController: getAddress(
          '0x929EC64c34a17401F460460D4B9390518E5B473e',
        ),
      },
    ],
    [Chain.Polygon]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
        incentivesController: getAddress(
          '0x929EC64c34a17401F460460D4B9390518E5B473e',
        ),
      },
    ],
    [Chain.Fantom]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
        incentivesController: getAddress(
          '0x929EC64c34a17401F460460D4B9390518E5B473e',
        ),
      },
    ],
    [Chain.Avalanche]: [
      {
        protocolDataProvider: getAddress(
          '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        ),
        incentivesController: getAddress(
          '0x929EC64c34a17401F460460D4B9390518E5B473e',
        ),
      },
    ],
    [Chain.Base]: [
      {
        protocolDataProvider: getAddress(
          '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
        ),
        incentivesController: getAddress(
          '0xf9cc4F0D883F1a1eb2c253bdb46c254Ca51E1F44',
        ),
      },
    ],
    [Chain.Bsc]: [
      {
        protocolDataProvider: getAddress(
          '0x23dF2a19384231aFD114b036C14b6b03324D79BC',
        ),
        incentivesController: getAddress(
          '0xC206C2764A9dBF27d599613b8F9A63ACd1160ab4',
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
      protocolContractAddresses[this.protocolId]![this.chainId]!

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
