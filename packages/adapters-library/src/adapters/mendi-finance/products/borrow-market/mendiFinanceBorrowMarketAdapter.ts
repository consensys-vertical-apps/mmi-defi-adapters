import { getAddress } from 'ethers'
import { z } from 'zod'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  GetTotalValueLockedInput,
  PositionType,
  ProtocolDetails,
  ProtocolTokenTvl,
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
import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter'
import { contractAddresses } from '../supply-market/mendiFinanceSupplyMarketAdapter'

export class MendiFinanceBorrowMarketAdapter extends CompoundV2BorrowMarketForkAdapter {
  productId = 'borrow-market'

  contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string; cUSDCv3Address: string }>
  > = contractAddresses

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
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
