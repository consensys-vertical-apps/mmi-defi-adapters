import { WeiPerEther, getAddress } from 'ethers'
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
import { Savings, Savings__factory } from '../../contracts'

enum Stablecoin {
  stEUR = 'stEUR',
  stUSD = 'stUSD',
}

export class AngleProtocolSavingsAdapter implements IProtocolAdapter {
  productId = 'savings'
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
      name: 'AngleProtocol',
      description: 'AngleProtocol defi adapter',
      siteUrl: 'https://angle.money',
      iconUrl:
        'https://raw.githubusercontent.com/AngleProtocol/angle-assets/main/02%20-%20Logos/02%20-%20Logo%20Only/angle-only-fill-blue.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const contractAddresses: Record<
      Stablecoin,
      Partial<Record<Chain, string>>
    > = {
      [Stablecoin.stEUR]: {
        [Chain.Ethereum]: getAddress(
          '0x004626A008B1aCdC4c74ab51644093b155e59A23',
        ),
        [Chain.Polygon]: getAddress(
          '0x004626A008B1aCdC4c74ab51644093b155e59A23',
        ),
        [Chain.Bsc]: getAddress('0x004626A008B1aCdC4c74ab51644093b155e59A23'),
        [Chain.Arbitrum]: getAddress(
          '0x004626A008B1aCdC4c74ab51644093b155e59A23',
        ),
        [Chain.Optimism]: getAddress(
          '0x004626A008B1aCdC4c74ab51644093b155e59A23',
        ),
        [Chain.Avalanche]: getAddress(
          '0x004626A008B1aCdC4c74ab51644093b155e59A23',
        ),
        [Chain.Base]: getAddress('0x004626A008B1aCdC4c74ab51644093b155e59A23'),
      },
      [Stablecoin.stUSD]: {
        [Chain.Ethereum]: getAddress(
          '0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776',
        ),
        [Chain.Polygon]: getAddress(
          '0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776',
        ),
        [Chain.Linea]: getAddress('0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776'),
        [Chain.Bsc]: getAddress('0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776'),
        [Chain.Arbitrum]: getAddress(
          '0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776',
        ),
        [Chain.Optimism]: getAddress(
          '0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776',
        ),
        [Chain.Avalanche]: getAddress(
          '0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776',
        ),
        [Chain.Base]: getAddress('0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776'),
      },
    }

    // load the contract based on this.chainId
    const savingsContract: Map<Stablecoin, Savings> = new Map()
    Object.keys(contractAddresses).map((key) => {
      if (!contractAddresses[key as Stablecoin][this.chainId]) return
      const contract = Savings__factory.connect(
        contractAddresses[key as Stablecoin][this.chainId]!,
        this.provider,
      )
      savingsContract.set(key as Stablecoin, contract)
    })

    const underlyingTokenAddresses: Map<Stablecoin, string> = new Map()
    await Promise.all(
      Array.from(savingsContract).map(async ([key, contract]) => {
        underlyingTokenAddresses.set(key, await contract.asset())
      }),
    )

    const protocolTokens: Map<Stablecoin, Erc20Metadata> = new Map()
    await Promise.all(
      Array.from(savingsContract).map(async ([key, contract]) => {
        protocolTokens.set(
          key,
          await getTokenMetadata(
            await contract.getAddress(),
            this.chainId,
            this.provider,
          ),
        )
      }),
    )

    const underlyingTokens: Map<Stablecoin, Erc20Metadata> = new Map()
    await Promise.all(
      Array.from(underlyingTokenAddresses).map(async ([key, address]) => {
        underlyingTokens.set(
          key,
          await getTokenMetadata(address, this.chainId, this.provider),
        )
      }),
    )

    return Array.from(protocolTokens).map(([key, protocolToken]) => ({
      ...protocolToken,
      underlyingTokens: [underlyingTokens.get(key)!],
    }))
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const tokens = await this.getProtocolTokens()

    return filterMapAsync(
      tokens,
      async ({ underlyingTokens: [underlyingToken], ...protocolToken }) => {
        if (
          input.protocolTokenAddresses &&
          !input.protocolTokenAddresses.includes(protocolToken.address)
        ) {
          return undefined
        }

        const savingContract = Savings__factory.connect(
          protocolToken.address,
          this.provider,
        )
        const balance = await savingContract.balanceOf(input.userAddress, {
          blockTag: input.blockNumber,
        })

        if (balance === 0n) {
          return undefined
        }

        const assetsBalance = await savingContract.convertToAssets(balance, {
          blockTag: input.blockNumber,
        })

        return {
          ...protocolToken,
          type: TokenType.Protocol,
          balanceRaw: balance,
          tokens: [
            {
              ...underlyingToken!,
              type: TokenType.Underlying,
              balanceRaw: assetsBalance,
            },
          ],
        }
      },
    )
  }

  async unwrap(input: UnwrapInput): Promise<UnwrapExchangeRate> {
    const tokens = await this.getProtocolTokens()
    const {
      underlyingTokens: [underlyingToken],
      ...protocolToken
    } = tokens.find((t) => t.address === input.protocolTokenAddress)!

    const savingsContract = Savings__factory.connect(
      input.protocolTokenAddress,
      this.provider,
    )
    const underlyingRateRaw = await savingsContract.convertToAssets(
      WeiPerEther,
      {
        blockTag: input.blockNumber,
      },
    )

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken!,
          type: TokenType.Underlying,
          underlyingRateRaw,
        },
      ],
    }
  }
}
