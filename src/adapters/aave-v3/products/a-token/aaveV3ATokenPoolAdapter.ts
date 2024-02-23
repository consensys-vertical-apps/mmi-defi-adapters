import { AddressLike, BigNumberish } from 'ethers'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { AaveBasePoolAdapter } from '../../../aave-v2/common/aaveBasePoolAdapter'
import { ProtocolDataProvider } from '../../../aave-v2/contracts'
import { PoolContract__factory } from '../../contracts'

export class AaveV3ATokenPoolAdapter extends AaveBasePoolAdapter {
  productId = 'a-token'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v3 AToken',
      description: 'Aave v3 defi adapter for yield-generating token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Lend,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'a-token-v3' })
  async buildMetadata() {
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
    return reserveData.liquidityRate
  }

  getTransactionParams({
    action,
    inputs,
  }: {
    action: string
    inputs: unknown[]
  }) {
    const poolContract = PoolContract__factory.connect(
      getAddress(this.chainId),
      this.provider,
    )

    switch (action) {
      case 'supply': {
        const [asset, amount, onBehalfOf, referralCode] = inputs as [
          AddressLike,
          BigNumberish,
          AddressLike,
          BigNumberish,
        ]
        return poolContract.supply.populateTransaction(
          asset,
          amount,
          onBehalfOf,
          referralCode,
        )
      }
      case 'withdraw': {
        const [asset, amount, to] = inputs as [
          AddressLike,
          BigNumberish,
          AddressLike,
        ]
        return poolContract.withdraw.populateTransaction(asset, amount, to)
      }
      case 'borrow': {
        const [asset, amount, interestRateMode, referralCode, onBehalfOf] =
          inputs as [
            AddressLike,
            BigNumberish,
            BigNumberish,
            BigNumberish,
            AddressLike,
          ]
        return poolContract.borrow.populateTransaction(
          asset,
          amount,
          interestRateMode,
          referralCode,
          onBehalfOf,
        )
      }
      case 'repay': {
        const [asset, amount, interestRateMode, onBehalfOf] = inputs as [
          AddressLike,
          BigNumberish,
          BigNumberish,
          AddressLike,
        ]
        return poolContract.repay.populateTransaction(
          asset,
          amount,
          interestRateMode,
          onBehalfOf,
        )
      }

      default:
        throw new Error('Method not supported')
    }
  }
}

const getAddress = (chainId: Chain) => {
  if (chainId == Chain.Ethereum) {
    return '0x5FAab9E1adbddaD0a08734BE8a52185Fd6558E14'
  }

  throw new Error('Chain not supported')
}
