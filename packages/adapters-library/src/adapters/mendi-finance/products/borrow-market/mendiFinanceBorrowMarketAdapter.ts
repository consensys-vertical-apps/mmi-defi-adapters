import { getAddress } from 'ethers'
import { z } from 'zod'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetTotalValueLockedInput,
  PositionType,
  ProtocolDetails,
  ProtocolTokenTvl,
  TokenBalance,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  WriteActionInputSchemas,
  WriteActions,
} from '../../../../types/writeActions'
import { Protocol } from '../../../protocols'
import { GetTransactionParams } from '../../../supportedProtocols'
import { Cerc20__factory, Comptroller__factory } from '../../contracts'

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
    usdcE: getAddress('0x176211869cA2b568f2A7D4EE941E073a821EE1ff'),
  },
}

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
}

export class MendiFinanceBorrowMarketAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'borrow-market'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
    version: 2,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MendiFinance',
      description: 'MendiFinance borrow adapter',
      siteUrl: 'https://mendi.finance/:',
      iconUrl: 'https://mendi.finance/mendi-token.svg',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'mendi' })
  async getProtocolTokens() {
    const comptrollerContract = Comptroller__factory.connect(
      contractAddresses[this.chainId]!.comptroller,
      this.provider,
    )

    const pools = await comptrollerContract.getAllMarkets()

    const metadataObject: ProtocolToken<AdditionalMetadata>[] = []

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

        metadataObject.push({
          ...protocolToken,
          underlyingTokens: [underlyingToken],
        })
      }),
    )
    return metadataObject
  }

  protected getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number | undefined
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  protected async unwrapProtocolToken(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    throw new NotImplementedError()
  }

  async getTransactionParams({
    action,
    inputs,
  }: Extract<
    GetTransactionParams,
    { protocolId: typeof Protocol.MendiFinance; productId: 'borrow-market' }
  >): Promise<{ to: string; data: string }> {
    const assetPool = Object.values(await this.getProtocolTokens()).find(
      (pool) => pool.address === inputs.asset,
    )

    if (!assetPool) {
      throw new Error('Asset pool not found')
    }

    const poolContract = Cerc20__factory.connect(
      assetPool.address,
      this.provider,
    )

    const { amount } = inputs

    switch (action) {
      case WriteActions.Borrow: {
        return poolContract.borrow.populateTransaction(amount)
      }
      case WriteActions.Repay: {
        return poolContract.repayBorrow.populateTransaction(amount)
      }
    }
  }
}

export const WriteActionInputs = {
  [WriteActions.Borrow]: z.object({
    asset: z.string(),
    amount: z.string(),
  }),
  [WriteActions.Repay]: z.object({
    asset: z.string(),
    amount: z.string(),
  }),
} satisfies WriteActionInputSchemas

// NOTE: The APY/APR feature has been removed as of March 2024.
// The below contains logic that may be useful for future features or reference. For more context on this decision, refer to ticket [MMI-4731].

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

// private async getProtocolTokenApy({
//   protocolTokenAddress,
//   blockNumber,
// }: GetApyInput): Promise<number> {
//   const poolContract = Cerc20__factory.connect(
//     protocolTokenAddress,
//     this.provider,
//   )

//   const srpb = await poolContract.borrowRatePerBlock.staticCall({
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

//   const tokenBorrows = await poolContract.totalBorrows.staticCall({
//     blockTag: blockNumber,
//   })

//   const underlingPrice = await oracleContract.getPrice.staticCall(
//     protocolTokenAddress,
//     { blockTag: blockNumber },
//   )

//   const tokenDecimal = underlyingTokenMetadata.decimals

//   const marketTotalBorrows =
//     (Number(tokenBorrows) / Math.pow(10, tokenDecimal)) *
//     Number(underlingPrice)
//   const apr =
//     (Number(supplySpeed.borrowSpeed) *
//       Number(mPriceFixed) *
//       SECONDS_PER_YEAR) /
//     marketTotalBorrows

//   return apr
// }
