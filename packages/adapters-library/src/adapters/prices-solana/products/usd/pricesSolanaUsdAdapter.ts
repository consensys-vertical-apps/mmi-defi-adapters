import { Connection } from '@solana/web3.js'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { Helpers } from '../../../../scripts/helpers'
import { AdapterSettings, UnwrapExchangeRate } from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IPricesAdapter } from '../../../prices-v2/products/usd/pricesV2UsdAdapter'

export class PricesSolanaUsdAdapter implements IPricesAdapter {
  productId = 'usd'
  chainId = Chain.Solana
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
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
