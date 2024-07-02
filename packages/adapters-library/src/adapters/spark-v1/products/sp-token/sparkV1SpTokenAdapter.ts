import { z } from 'zod'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  WriteActionInputSchemas,
  WriteActions,
} from '../../../../types/writeActions'
import { GetTransactionParams } from '../../../supportedProtocols'
import { PoolContract__factory, ProtocolDataProvider } from '../../contracts'

import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import {
  SparkMetadata,
  SparkV1BasePoolAdapter,
} from '../../common/SparkV1BasePoolAdapter'

export class SparkV1SpTokenAdapter extends SparkV1BasePoolAdapter {
  productId = 'sp-token'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'SparkV1',
      description: 'SparkV1 defi adapter',
      siteUrl: 'https://spark.fi',
      iconUrl:
        'https://github.com/marsfoundation/spark-app/blob/main/packages/app/public/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'sp-token-v1' })
  async buildMetadata(): Promise<SparkMetadata> {
    return super.buildMetadata()
  }

  protected getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string {
    return reserveTokenAddresses.aTokenAddress
  }

  protected getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint {
    return reserveData.variableBorrowRate
  }

  getTransactionParams({
    action,
    inputs,
  }: Extract<
    GetTransactionParams,
    { protocolId: typeof Protocol.SparkV1; productId: 'sp-token' }
  >): Promise<{ to: string; data: string }> {
    const poolContract = PoolContract__factory.connect(
      getAddress(this.chainId),
      this.provider,
    )

    switch (action) {
      case WriteActions.Deposit: {
        const { asset, amount, onBehalfOf, referralCode } = inputs
        return poolContract.supply.populateTransaction(
          asset,
          amount,
          onBehalfOf,
          referralCode,
        )
      }

      case WriteActions.Withdraw: {
        const { asset, amount, to } = inputs
        return poolContract.withdraw.populateTransaction(asset, amount, to)
      }

      case WriteActions.Borrow: {
        const { asset, amount, interestRateMode, referralCode, onBehalfOf } =
          inputs
        return poolContract.borrow.populateTransaction(
          asset,
          amount,
          interestRateMode,
          referralCode,
          onBehalfOf,
        )
      }

      case WriteActions.Repay: {
        const { asset, amount, interestRateMode, onBehalfOf } = inputs
        return poolContract.repay.populateTransaction(
          asset,
          amount,
          interestRateMode,
          onBehalfOf,
        )
      }
    }
  }
}

const getAddress = (chainId: Chain) => {
  if (chainId === Chain.Ethereum) {
    return '0xC13e21B648A5Ee794902342038FF3aDAB66BE987'
  }

  throw new Error('Chain not supported')
}

export const WriteActionInputs = {
  [WriteActions.Deposit]: z.object({
    asset: z.string(),
    amount: z.string(),
    onBehalfOf: z.string(),
    referralCode: z.number(),
  }),
  [WriteActions.Withdraw]: z.object({
    asset: z.string(),
    amount: z.string(),
    to: z.string(),
  }),
  [WriteActions.Borrow]: z.object({
    asset: z.string(),
    amount: z.string(),
    interestRateMode: z.number(),
    referralCode: z.number(),
    onBehalfOf: z.string(),
  }),
  [WriteActions.Repay]: z.object({
    asset: z.string(),
    amount: z.string(),
    interestRateMode: z.number(),
    onBehalfOf: z.string(),
  }),
} satisfies WriteActionInputSchemas
