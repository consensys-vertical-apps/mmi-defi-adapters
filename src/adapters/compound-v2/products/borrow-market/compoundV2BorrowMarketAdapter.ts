import { AddressLike, BigNumberish } from 'ethers'
import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  ProtocolDetails,
  PositionType,
  AssetType,
} from '../../../../types/adapter'
import { contractAddresses } from '../../common/contractAddresses'
import { CUSDCv3__factory } from '../../contracts'

export class CompoundV2BorrowMarketAdapter extends CompoundV2BorrowMarketForkAdapter {
  productId = 'borrow-market'

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
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return await super.buildMetadata()
  }

  getTransactionParams({
    action,
    inputs,
  }: {
    action: string
    inputs: unknown[]
  }) {
    const poolContract = CUSDCv3__factory.connect(
      contractAddresses[this.chainId]!.cUSDCv3Address,
      this.provider,
    )

    // TODO - Needs validation with zod
    const [asset, amount] = inputs as [AddressLike, BigNumberish]

    switch (action) {
      case 'borrow': {
        return poolContract.withdraw.populateTransaction(asset, amount)
      }
      case 'repay': {
        return poolContract.supply.populateTransaction(asset, amount)
      }

      // TODO - Validate along with input using zod
      default: {
        throw new Error('Method not supported')
      }
    }
  }
}
