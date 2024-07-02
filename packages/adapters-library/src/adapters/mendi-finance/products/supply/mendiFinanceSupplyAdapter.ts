import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Cerc20__factory, Comptroller__factory } from '../../contracts'

type MendiFinanceSupplyAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

const contractAddresses: Partial<
  Record<
    Chain,
    {
      comptroller: string
      speed: string
      oracle: string
      velocore: string
      converter: string
      mendi: string
      usdcE: string
    }
  >
> = {
  [Chain.Linea]: {
    comptroller: getAddress('0x1b4d3b0421dDc1eB216D230Bc01527422Fb93103'),
    speed: getAddress('0x3b9B9364Bf69761d308145371c38D9b558013d40'),
    oracle: getAddress('0xCcBea2d7e074744ab46e28a043F85038bCcfFec2'),
    velocore: getAddress('0xaA18cDb16a4DD88a59f4c2f45b5c91d009549e06'),
    converter: getAddress('0xAADAa473C1bDF7317ec07c915680Af29DeBfdCb5'),
    mendi: getAddress('0x43E8809ea748EFf3204ee01F08872F063e44065f'),
    usdcE: getAddress('0x176211869ca2b568f2a7d4ee941e073a821ee1ff'),
  },
}

export class MendiFinanceSupplyAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'supply'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MendiFinance',
      description: 'MendiFinance borrow adapter',
      siteUrl: 'https://mendi.finance/:',
      iconUrl: 'https://mendi.finance/mendi-token.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'mendi' })
  async buildMetadata() {
    const comptrollerContract = Comptroller__factory.connect(
      contractAddresses[this.chainId]!.comptroller,
      this.provider,
    )

    const pools = await comptrollerContract.getAllMarkets()

    const metadataObject: MendiFinanceSupplyAdapterMetadata = {}

    await Promise.all(
      pools.map(async (poolContractAddress) => {
        const poolContract = Cerc20__factory.connect(
          poolContractAddress,
          this.provider,
        )

        let underlyingContractAddress: string
        try {
          underlyingContractAddress = await poolContract.underlying()
        } catch (error) {
          underlyingContractAddress = ZERO_ADDRESS
        }

        const protocolTokenPromise = getTokenMetadata(
          poolContractAddress,
          this.chainId,
          this.provider,
        )
        const underlyingTokenPromise = getTokenMetadata(
          underlyingContractAddress,
          this.chainId,
          this.provider,
        )

        const [protocolToken, underlyingToken] = await Promise.all([
          protocolTokenPromise,
          underlyingTokenPromise,
        ])

        metadataObject[protocolToken.address] = {
          protocolToken,
          underlyingToken,
        }
      }),
    )
    return metadataObject
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances({
    userAddress,
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const poolContract = Cerc20__factory.connect(
      protocolTokenBalance.address,
      this.provider,
    )

    const underlyingBalance = await poolContract.balanceOfUnderlying.staticCall(
      userAddress,
      {
        blockTag: blockNumber,
      },
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: underlyingBalance,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    const poolContract = Cerc20__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const exchangeRateCurrent =
      await poolContract.exchangeRateCurrent.staticCall({
        blockTag: blockNumber,
      })

    // The current exchange rate is scaled by 1 * 10^(18 - 8 + Underlying Token Decimals).
    const adjustedExchangeRate = exchangeRateCurrent / 10n ** 10n

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: adjustedExchangeRate,
      },
    ]
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return [underlyingToken]
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

  /**
   * Retrieves transaction parameters for specific actions based on provided inputs.
   *
   * Implementation Steps:
   * 1. Implement logic for handling predefined actions (e.g., Supply, Withdraw). Consider the examples provided as a starting point.
   * 2. For new actions (e.g., Stake, Flash Loan), first extend the \`WriteActions\` object to include these new actions.
   * 3. Export a WriteActionInputs object that satisfies WriteActionInputSchemas from this file.
   * 4. Implement the method logic for each action, extracting necessary inputs and populating transactions accordingly.
   *
   * Example Implementations:
   * - Deposit: Extract 'asset', 'amount', 'onBehalfOf', and 'referralCode' from inputs. Use these to populate transactions with 'poolContract.supply.populateTransaction(...)'.
   * - Withdraw: Follow a similar approach, adapting the parameters and transaction population as necessary for the action.
   *
   * Ensure the implementation supports all main end-user actions. Developers are encouraged to incorporate error handling tailored to specific business logic requirements.
   *
   * TODO: Replace code with actual implementation logic according to your protocol's requirements and the actions supported.
   */
  // getTransactionParams({
  //   action,
  //   inputs,
  // }: Extract<
  //   GetTransactionParams,
  //   { protocolId: typeof Protocol.MendiFinance; productId: 'supply' }
  // >): Promise<{ to: string; data: string }> {
  //   // Example switch case structure for implementation:
  //   switch (action) {
  //     case WriteActions.Deposit: {
  //       const { asset, amount, onBehalfOf, referralCode } = inputs
  //       return poolContract.supply.populateTransaction(
  //         asset,
  //         amount,
  //         onBehalfOf,
  //         referralCode,
  //       )
  //     }
  //     case WriteActions.Withdraw: {
  //       const { asset, amount, to } = inputs
  //       return poolContract.withdraw.populateTransaction(asset, amount, to)
  //     }
  //   }
  // }
}

// export const WriteActionInputs = {
//   [WriteActions.Deposit]: z.object({}),
//   [WriteActions.Withdraw]: z.object({}),
// } satisfies WriteActionInputSchemas

// NOTE: The APY/APR feature has been removed as of March 2024.
// The below contains logic that may be useful for future features or reference. For more context on this decision, refer to ticket [MMI-4731].

// private async getProtocolTokenApy({
//   protocolTokenAddress,
//   blockNumber,
// }: GetApyInput): Promise<number> {
//   const poolContract = Cerc20__factory.connect(
//     protocolTokenAddress,
//     this.provider,
//   )

//   const srpb = await poolContract.supplyRatePerBlock.staticCall({
//     blockTag: blockNumber,
//   })
//   const apr = (Number(srpb) * Number(SECONDS_PER_YEAR)) / Number(1e18)
//   const apy = aprToApy(apr, SECONDS_PER_YEAR)

//   return apy
// }

// private async getProtocolTokenApr({
//   protocolTokenAddress,
//   blockNumber,
// }: GetAprInput): Promise<number> {
//   const poolContract = Cerc20__factory.connect(
//     protocolTokenAddress,
//     this.provider,
//   )
//   const underlyingTokenMetadata = (
//     await this.fetchPoolMetadata(protocolTokenAddress)
//   ).underlyingToken

//   const speedContract = Speed__factory.connect(
//     contractAddresses[this.chainId]!.speed,
//     this.provider,
//   )

//   const oracleContract = Oracle__factory.connect(
//     contractAddresses[this.chainId]!.oracle,
//     this.provider,
//   )

//   const velocoreContract = Velocore__factory.connect(
//     contractAddresses[this.chainId]!.velocore,
//     this.provider,
//   )

//   const converterContract = Converter__factory.connect(
//     contractAddresses[this.chainId]!.converter,
//     this.provider,
//   )

//   const mendiAddress = contractAddresses[this.chainId]!.mendi

//   const convertValue = await converterContract.latestAnswer.staticCall({
//     blockTag: blockNumber,
//   })

//   const baseTokenBytes32 =
//     '0x' +
//     contractAddresses[this.chainId]!.usdcE.replace(/^0x/, '').padStart(
//       64,
//       '0',
//     )

//   const quoteTokenBytes32 =
//     '0x' + mendiAddress.replace(/^0x/, '').padStart(64, '0')

//   const mPrice = await velocoreContract.spotPrice.staticCall(
//     quoteTokenBytes32,
//     baseTokenBytes32,
//     10n ** 18n,
//     { blockTag: blockNumber },
//   )
//   const mPriceFixed = (
//     (Number(mPrice) / 1e6) *
//     (Number(convertValue) / 1e8)
//   ).toFixed(3)

//   const supplySpeed = await speedContract.rewardMarketState.staticCall(
//     mendiAddress,
//     protocolTokenAddress,
//     { blockTag: blockNumber },
//   )

//   const tokenSupply = await poolContract.totalSupply.staticCall({
//     blockTag: blockNumber,
//   })

//   const exchangeRateStored = await poolContract.exchangeRateStored.staticCall(
//     { blockTag: blockNumber },
//   )

//   const underlingPrice = await oracleContract.getPrice.staticCall(
//     protocolTokenAddress,
//     { blockTag: blockNumber },
//   )

//   const tokenDecimal = underlyingTokenMetadata.decimals

//   const marketTotalSupply =
//     (Number(tokenSupply) / Math.pow(10, tokenDecimal)) *
//     (Number(exchangeRateStored) / 1e18) *
//     Number(underlingPrice)
//   const apr =
//     (Number(supplySpeed.supplySpeed) *
//       Number(mPriceFixed) *
//       SECONDS_PER_YEAR) /
//     marketTotalSupply

//   return apr
// }

// async getApy({
//   protocolTokenAddress,
//   blockNumber,
// }: GetApyInput): Promise<ProtocolTokenApy> {
//   const apy = await this.getProtocolTokenApy({
//     protocolTokenAddress,
//     blockNumber,
//   })

//   return {
//     ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
//     apyDecimal: apy * 100,
//   }
// }

// async getApr({
//   protocolTokenAddress,
//   blockNumber,
// }: GetAprInput): Promise<ProtocolTokenApr> {
//   const apr = await this.getProtocolTokenApr({
//     protocolTokenAddress,
//     blockNumber,
//   })

//   return {
//     ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
//     aprDecimal: apr * 100,
//   }
// }
