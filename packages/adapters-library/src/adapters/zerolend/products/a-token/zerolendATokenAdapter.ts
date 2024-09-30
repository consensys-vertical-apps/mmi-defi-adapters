import { z } from 'zod'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import {
  WriteActionInputSchemas,
  WriteActions,
} from '../../../../types/writeActions'
import { Protocol } from '../../../protocols'
import { GetTransactionParams } from '../../../supportedProtocols'
import { PoolContract__factory, ProtocolDataProvider } from '../../contracts'
import { ZeroLendBasePoolAdapter } from '../common/zerolendBasePoolAdapter'

export class ZeroLendATokenPoolAdapter extends ZeroLendBasePoolAdapter {
  productId = 'a-token'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ZeroLend AToken', // todo change
      description: 'ZeroLend defi adapter for yield-generating token', // todo change
      siteUrl: 'https://app.zerolend.xyz/',
      iconUrl: 'https://app.zerolend.xyz/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb()
  async getProtocolTokens() {
    return super.getProtocolTokens()
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
    return reserveData.liquidityRate
  }

  getTransactionParams({
    action,
    inputs,
  }: Extract<
    GetTransactionParams,
    { protocolId: typeof Protocol.AaveV3; productId: 'a-token' }
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
  switch (chainId) {
    case Chain.Ethereum:
      return '0xFD856E1a33225B86f70D686f9280435E3fF75FCF' // TODO: add btc market too
    case Chain.Linea:
      return '0xC44827C51d00381ed4C52646aeAB45b455d200eB'
    default:
      throw new Error('Chain not supported')
  }
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
