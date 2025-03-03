import type { Connection } from '@solana/web3.js'
import type { AdaptersController } from '../../../../core/adaptersController.js'
import { Chain } from '../../../../core/constants/chains.js'
import type { Helpers } from '../../../../core/helpers.js'
import type {
  AdapterSettings,
  UnwrapExchangeRate,
} from '../../../../types/adapter.js'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import type { IPricesAdapter } from '../../../prices-v2/products/usd/pricesV2UsdAdapter.js'

export class PricesSolanaUsdAdapter implements IPricesAdapter {
  productId = 'usd'
  chainId = Chain.Solana
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
  }

  private provider: Connection

  adaptersController: AdaptersController

  constructor({
    provider,
    adaptersController,
  }: {
    provider: Connection
    adaptersController: AdaptersController
  }) {
    this.provider = provider
    this.adaptersController = adaptersController
    this.helpers = {} as Helpers
  }

  async getPrice({
    blockNumber,
    tokenMetadata,
  }: {
    blockNumber: number
    tokenMetadata: Erc20Metadata
  }): Promise<UnwrapExchangeRate> {
    // TODO Implement price fetching
    throw new Error('Error fetching price')
  }
}
