import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  GetApyInput,
  GetAprInput,
  GetConversionRateInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProtocolTokenTvl,
  ProtocolPosition,
  AssetType,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { GetTransactionParamsInput } from '../../../../types/getTransactionParamsInput'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
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

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'AngleProtocol',
      description: 'AngleProtocol defi adapter',
      siteUrl: 'https://angle.money',
      iconUrl:
        'https://raw.githubusercontent.com/AngleProtocol/angle-assets/main/02%20-%20Logos/02%20-%20Logo%20Only/angle-only-fill-coral.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  /**
   * Retrieves transaction parameters for specific actions based on provided inputs.
   *
   * Implementation Steps:
   * 1. Implement logic for handling predefined actions (e.g., Supply, Withdraw). Consider the examples provided as a starting point.
   * 2. For new actions (e.g., Stake, Flash Loan), first extend the 'WriteActions' object to include these new actions.
   * 3. Update 'GetTransactionParamsInput' type to include the parameters required for any new actions you add.
   * 4. Implement the method logic for each action, extracting necessary inputs and populating transactions accordingly.
   *
   * Example Implementations:
   * - Supply: Extract 'asset', 'amount', 'onBehalfOf', and 'referralCode' from inputs. Use these to populate transactions with 'poolContract.supply.populateTransaction(...)'.
   * - Withdraw: Follow a similar approach, adapting the parameters and transaction population as necessary for the action.
   *
   * Ensure the implementation supports all main end-user actions. Developers are encouraged to incorporate error handling tailored to specific business logic requirements.
   *
   * TODO: Replace the 'NotImplementedError' with actual implementation logic according to your protocol's requirements and the actions supported.
   */
  getTransactionParams({
    action,
    inputs,
  }: Extract<
    GetTransactionParamsInput,
    {
      protocolId: typeof Protocol.AngleProtocol
      productId: 'savings'
    }
  >): Promise<{ to: string; data: string }> {
    throw new NotImplementedError()
    // Example switch case structure for implementation:
    // switch (action) {
    //   case WriteActions.Deposit: {
    //     const { asset, amount, onBehalfOf, referralCode } = inputs;
    //     return poolContract.supply.populateTransaction(
    //       asset, amount, onBehalfOf, referralCode,
    //     );
    //   }
    //   case WriteActions.Withdraw: {
    //     // const { asset, amount, to } = inputs;
    //     // return poolContract.withdraw.populateTransaction(asset, amount, to);
    //   }
    //   default:
    //     throw new Error('Method not supported');
    // }
  }

  /**
   * Add logic to build protocol token metadata
   * For context see dashboard example ./dashboard.png
   * We need protocol token names, decimals, and also linked underlying tokens
   */
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

  /**
   * Returning an array of your protocol tokens.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const metadata = await this.buildMetadata()
    return metadata.map((m) => m.protocolToken)
  }

  /**
   * Update me.
   * Add logic to get userAddress positions in your protocol
   */
  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const tokens = await this.buildMetadata()

    return await Promise.all(
      tokens.map(async (token) => {
        const savingContract = Savings__factory.connect(
          token.protocolToken.address,
          this.provider,
        )
        const balance = await savingContract.balanceOf(_input.userAddress, {
          blockTag: _input.blockNumber,
        })
        const assetsBalance = await savingContract.convertToAssets(balance, {
          blockTag: _input.blockNumber,
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
      }),
    )
  }

  /**
   * Update me.
   * Add logic to get user's withdrawals per position by block range
   */
  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    const tokens = await this.buildMetadata()
    const token = tokens.find(
      (t) => t.protocolToken.address === _input.protocolTokenAddress,
    )!

    const savingContract = Savings__factory.connect(
      _input.protocolTokenAddress,
      this.provider,
    )

    const filter = savingContract.filters.Withdraw(
      undefined,
      _input.userAddress,
    )
    const eventResults = await savingContract.queryFilter(
      filter,
      _input.fromBlock,
      _input.toBlock,
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

  /**
   * Update me.
   * Add logic to get user's deposits per position by block range
   */
  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    const tokens = await this.buildMetadata()
    const token = tokens.find(
      (t) => t.protocolToken.address === _input.protocolTokenAddress,
    )!

    const savingContract = Savings__factory.connect(
      _input.protocolTokenAddress,
      this.provider,
    )

    const filter = savingContract.filters.Deposit(undefined, _input.userAddress)
    const eventResults = await savingContract.queryFilter(
      filter,
      _input.fromBlock,
      _input.toBlock,
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

  /**
   * Update me.
   * Add logic to get tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const tokens = await this.buildMetadata()

    return await Promise.all(
      tokens.map(async (token) => {
        const saving = Savings__factory.connect(
          token.protocolToken.address,
          this.provider,
        )
        const totalValueLocked = await saving.totalAssets()
        const totalSupply = await saving.totalSupply()
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

  /**
   * Add logic to calculate the underlying token rate of 1 protocol token
   */
  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    const tokens = await this.buildMetadata()
    const token = tokens.find(
      (t) => t.protocolToken.address === _input.protocolTokenAddress,
    )!

    const savingsContract = Savings__factory.connect(
      _input.protocolTokenAddress,
      this.provider,
    )
    const underlyingRateRaw = await savingsContract.convertToAssets(1e18)

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

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    const apr = await this.getApr({
      protocolTokenAddress: _input.protocolTokenAddress,
    })

    const apyDecimal = apr.aprDecimal
    return { apyDecimal, ...apr }
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    const saving = Savings__factory.connect(
      _input.protocolTokenAddress,
      this.provider,
    )

    const metadata = await this.buildMetadata()
    const protocolToken = metadata.find(
      (m) => m.protocolToken.address === _input.protocolTokenAddress,
    )!.protocolToken

    const apr = await saving.estimatedAPR({
      blockTag: _input.blockNumber,
    })
    const aprDecimal = parseFloat(apr.toString()) / 1e18

    return { aprDecimal, ...protocolToken }
  }
}
