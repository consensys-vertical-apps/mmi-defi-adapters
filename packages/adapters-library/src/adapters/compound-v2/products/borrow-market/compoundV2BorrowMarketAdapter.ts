import { z } from 'zod'
import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter.js'
import type { Chain } from '../../../../core/constants/chains.js'
import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import {
  type WriteActionInputSchemas,
  WriteActions,
} from '../../../../types/writeActions.js'
import type { Protocol } from '../../../protocols.js'
import type { GetTransactionParams } from '../../../supportedProtocols.js'
import { contractAddresses } from '../../common/contractAddresses.js'
import { CUSDCv3__factory } from '../../contracts/index.js'

export class CompoundV2BorrowMarketAdapter extends CompoundV2BorrowMarketForkAdapter {
  productId = 'borrow-market'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string; cUSDCv3Address: string }>
  > = contractAddresses

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'CompoundV2',
      description: 'CompoundV2 borrow market adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  getTransactionParams({
    action,
    inputs,
  }: Extract<
    GetTransactionParams,
    { protocolId: typeof Protocol.CompoundV2; productId: 'borrow-market' }
  >): Promise<{ to: string; data: string }> {
    const poolContract = CUSDCv3__factory.connect(
      contractAddresses[this.chainId]!.cUSDCv3Address,
      this.provider,
    )

    const { asset, amount } = inputs

    switch (action) {
      case WriteActions.Borrow: {
        return poolContract.withdraw.populateTransaction(asset, amount)
      }

      case WriteActions.Repay: {
        return poolContract.supply.populateTransaction(asset, amount)
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
