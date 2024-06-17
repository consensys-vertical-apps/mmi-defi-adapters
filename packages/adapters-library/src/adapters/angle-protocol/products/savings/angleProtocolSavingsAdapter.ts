import { WeiPerEther, getAddress } from 'ethers'
import { z } from 'zod'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
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
import {
  WriteActionInputSchemas,
  WriteActions,
} from '../../../../types/writeActions'
import { Protocol } from '../../../protocols'
import { GetTransactionParams } from '../../../supportedProtocols'
import { Savings, Savings__factory } from '../../contracts'

type AngleProtocolMetadata = {
  protocolToken: Erc20Metadata
  underlyingToken: Erc20Metadata
}[]

enum Stablecoin {
  stEUR = 'stEUR',
  stUSD = 'stUSD',
}

export class AngleProtocolSavingsAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'savings'
  protocolId: Protocol
  chainId: Chain

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
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
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-tokens' })
  async buildMetadata() {
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

    const metadataObject: AngleProtocolMetadata = Array.from(
      protocolTokens,
    ).map(([key, protocolToken]) => ({
      protocolToken,
      underlyingToken: underlyingTokens.get(key)!,
    }))

    return metadataObject
  }

  async getTransactionParams({
    action,
    inputs,
  }: Extract<
    GetTransactionParams,
    { protocolId: typeof Protocol.AngleProtocol; productId: 'savings' }
  >): Promise<{ to: string; data: string }> {
    const { asset } = inputs
    const tokens = await this.buildMetadata()
    const token = tokens.find((t) => t.underlyingToken.address === asset)!
    const savingContract = Savings__factory.connect(
      token.protocolToken.address,
      this.provider,
    )
    switch (action) {
      case WriteActions.Deposit: {
        const { amount, receiver } = inputs
        return savingContract.deposit.populateTransaction(amount, receiver)
      }
      case WriteActions.Withdraw: {
        const { owner, amount, receiver } = inputs
        return savingContract.redeem.populateTransaction(
          amount,
          receiver,
          owner,
        )
      }
      default:
        throw new Error(`Action ${action} not supported`)
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const metadata = await this.buildMetadata()
    return metadata.map((m) => m.protocolToken)
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const tokens = await this.buildMetadata()

    return filterMapAsync(tokens, async (token) => {
      if (
        input.protocolTokenAddresses &&
        !input.protocolTokenAddresses.includes(token.protocolToken.address)
      ) {
        return undefined
      }

      const savingContract = Savings__factory.connect(
        token.protocolToken.address,
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
        ...token.protocolToken,
        type: TokenType.Protocol,
        balanceRaw: balance,
        tokens: [
          {
            ...token.underlyingToken,
            type: TokenType.Underlying,
            balanceRaw: assetsBalance,
          },
        ],
      }
    })
  }

  async getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]> {
    const tokens = await this.buildMetadata()
    const token = tokens.find(
      (t) => t.protocolToken.address === input.protocolTokenAddress,
    )!

    const savingContract = Savings__factory.connect(
      input.protocolTokenAddress,
      this.provider,
    )

    const filter = savingContract.filters.Withdraw(undefined, input.userAddress)
    const eventResults = await savingContract.queryFilter(
      filter,
      input.fromBlock,
      input.toBlock,
    )

    return eventResults.map((event) => ({
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      protocolToken: token.protocolToken,
      tokens: [
        {
          ...token.underlyingToken,
          type: TokenType.Underlying,
          balanceRaw: event.args?.assets,
        },
      ],
    }))
  }

  async getDeposits(input: GetEventsInput): Promise<MovementsByBlock[]> {
    const tokens = await this.buildMetadata()
    const token = tokens.find(
      (t) => t.protocolToken.address === input.protocolTokenAddress,
    )!

    const savingContract = Savings__factory.connect(
      input.protocolTokenAddress,
      this.provider,
    )

    const filter = savingContract.filters.Deposit(undefined, input.userAddress)
    const eventResults = await savingContract.queryFilter(
      filter,
      input.fromBlock,
      input.toBlock,
    )

    return eventResults.map((event) => ({
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      protocolToken: token.protocolToken,
      tokens: [
        {
          ...token.underlyingToken,
          type: TokenType.Underlying,
          balanceRaw: event.args?.assets,
        },
      ],
    }))
  }

  async getTotalValueLocked(
    input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const tokens = await this.buildMetadata()

    return await Promise.all(
      tokens.map(async (token) => {
        const saving = Savings__factory.connect(
          token.protocolToken.address,
          this.provider,
        )
        const totalValueLocked = await saving.totalAssets({
          blockTag: input.blockNumber,
        })
        const totalSupply = await saving.totalSupply({
          blockTag: input.blockNumber,
        })
        return {
          ...token.protocolToken,
          type: TokenType.Protocol,
          totalSupplyRaw: totalSupply,
          tokens: [
            {
              ...token.underlyingToken,
              type: TokenType.Underlying,
              totalSupplyRaw: totalValueLocked,
            },
          ],
        }
      }),
    )
  }

  async unwrap(input: UnwrapInput): Promise<UnwrapExchangeRate> {
    const tokens = await this.buildMetadata()
    const token = tokens.find(
      (t) => t.protocolToken.address === input.protocolTokenAddress,
    )!

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
      ...token.protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...token.underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw,
        },
      ],
    }
  }

  // NOTE: The APY/APR feature has been removed as of March 2024.
  // The below contains logic that may be useful for future features or reference. For more context on this decision, refer to ticket [MMI-4731].

  // async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
  //   const apr = await this.getApr({
  //     protocolTokenAddress: _input.protocolTokenAddress,
  //   })

  //   const apyDecimal = aprToApy(apr.aprDecimal, SECONDS_PER_YEAR)
  //   return { apyDecimal, ...apr }
  // }

  // async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
  //   const saving = Savings__factory.connect(
  //     _input.protocolTokenAddress,
  //     this.provider,
  //   )

  //   const metadata = await this.buildMetadata()
  //   const protocolToken = metadata.find(
  //     (m) => m.protocolToken.address === _input.protocolTokenAddress,
  //   )!.protocolToken

  //   const apr = await saving.estimatedAPR({
  //     blockTag: _input.blockNumber,
  //   })
  //   const aprDecimal = parseFloat(apr.toString()) / 1e18

  //   return { aprDecimal, ...protocolToken }
  // }
}

export const WriteActionInputs = {
  [WriteActions.Deposit]: z.object({
    asset: z.string(),
    amount: z.string(),
    receiver: z.string(),
  }),
  [WriteActions.Withdraw]: z.object({
    asset: z.string(),
    amount: z.string(),
    receiver: z.string(),
    owner: z.string(),
  }),
} satisfies WriteActionInputSchemas
