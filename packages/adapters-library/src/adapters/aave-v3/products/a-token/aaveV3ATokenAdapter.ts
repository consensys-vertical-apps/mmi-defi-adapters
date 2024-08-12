import { getAddress } from 'ethers'
import { z } from 'zod'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { findEventArgs } from '../../../../core/utils/findEventArgs'
import {
  AssetType,
  GetEventsInput,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  TokenType,
} from '../../../../types/adapter'
import {
  WriteActionInputSchemas,
  WriteActions,
} from '../../../../types/writeActions'
import { AaveBasePoolAdapter } from '../../../aave-v2/common/aaveBasePoolAdapter'
import { ProtocolDataProvider } from '../../../aave-v2/contracts'
import { Protocol } from '../../../protocols'
import { GetTransactionParams } from '../../../supportedProtocols'
import { AToken__factory, Pool__factory } from '../../contracts'
import { TransferEvent } from '../../contracts/AToken'
import { SupplyEvent } from '../../contracts/Pool'
import { PoolContract } from '../../contracts/PoolContract'

const PoolContractAddresses: Partial<Record<Chain, string>> = {
  [Chain.Ethereum]: getAddress('0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'),
  [Chain.Optimism]: getAddress('0x794a61358D6845594F94dc1DB02A252b5b4814aD'),
  [Chain.Arbitrum]: getAddress('0x794a61358D6845594F94dc1DB02A252b5b4814aD'),
  [Chain.Polygon]: getAddress('0x794a61358D6845594F94dc1DB02A252b5b4814aD'),
  [Chain.Fantom]: getAddress('0x794a61358D6845594F94dc1DB02A252b5b4814aD'),
  [Chain.Avalanche]: getAddress('0x794a61358D6845594F94dc1DB02A252b5b4814aD'),
  [Chain.Base]: getAddress('0xA238Dd80C259a72e81d7e4664a9801593F98d1c5'),
}

export class AaveV3ATokenPoolAdapter extends AaveBasePoolAdapter {
  productId = 'a-token'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
    version: 2,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v3 AToken',
      description: 'Aave v3 defi adapter for yield-generating token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'a-token-v3' })
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
    const poolContractAddress = PoolContractAddresses[this.chainId]

    if (!poolContractAddress) {
      throw new Error('Chain not supported')
    }

    const poolContract = Pool__factory.connect(
      poolContractAddress,
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

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolToken =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const aTokenContract = AToken__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const filter = aTokenContract.filters.Transfer(undefined, userAddress)

    const eventResults = await aTokenContract.queryFilter<TransferEvent.Event>(
      filter,
      fromBlock,
      toBlock,
    )

    const poolContractAddress = PoolContractAddresses[this.chainId]

    if (!poolContractAddress) {
      throw new Error('Chain not supported')
    }

    const poolContract = Pool__factory.connect(
      poolContractAddress,
      this.provider,
    )

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const { blockNumber, transactionHash } = transferEvent

        const supplyEvent = await findEventArgs<PoolContract, SupplyEvent.Log>(
          transactionHash,
          poolContract,
          'Supply(address,address,address,uint256,uint16)',
          this.provider,
        )

        return {
          transactionHash,
          protocolToken: {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          },
          tokens: [
            {
              address: protocolToken.address,
              name: protocolToken.name,
              symbol: protocolToken.symbol,
              decimals: protocolToken.decimals,
              balanceRaw: supplyEvent.amount,
              type: TokenType.Underlying,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )
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
