import { Chain } from '../../../../core/constants/chains'
import {
  ProtocolDetails,
  PositionType,
  Underlying,
  TokenBalance,
  TokenType,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
// import {
//   WriteActionInputSchemas,
//   WriteActions,
// } from '../../../../types/writeActions'
// import { z } from 'zod'
// import { GetTransactionParams } from '../../../supportedProtocols'
// import { Protocol } from '../../../protocols'
// import {
//   CurveStableSwapMetaNg__factory,
//   CurveStableSwapNg__factory,
// } from '../../contracts'

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
}

const PROTOCOL_TOKEN_ADDRESS = '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C'
export class MountainProtocolUsdmAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'usdm'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
    version: 2,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Mountain Protocol USDM',
      description: 'MountainProtocol defi adapter',
      siteUrl: 'https://mountainprotocol.com/',
      iconUrl: 'https://mountainprotocol.com/favicon.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async getProtocolTokens() {
    return [
      {
        address: PROTOCOL_TOKEN_ADDRESS,
        name: 'Mountain Protocol USD',
        symbol: 'USDM',
        decimals: 18,
        underlyingTokens: [
          {
            address: this.getUSDCAddress(),
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 18,
          },
        ],
      },
    ]
  }

  private getUSDCAddress(): string {
    switch (this.chainId) {
      case Chain.Ethereum:
        return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      case Chain.Polygon:
        return '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
      case Chain.Base:
        return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      case Chain.Arbitrum:
        return '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
      case Chain.Optimism:
        return '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      default:
        throw new Error('Chain not supported')
    }
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    const underlyingTokenBalance = {
      ...underlyingToken!,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    // Always pegged one to one to underlying
    const pricePerShareRaw = BigInt(10 ** protocolTokenMetadata.decimals)

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }

  // protected async getEthereumParams({
  //   action,
  //   amount,
  // }: {
  //   action: WriteActions
  //   amount: number
  // }): Promise<{ to: string; data: string }> {
  //   const poolContract = CurveStableSwapMetaNg__factory.connect(
  //     '0xC83b79C07ECE44b8b99fFa0E235C00aDd9124f9E',
  //     this.provider,
  //   )

  //   switch (action) {
  //     case WriteActions.Deposit:
  //       return poolContract.exchange_underlying.populateTransaction(
  //         2,
  //         0,
  //         amount,
  //         amount * 0.99,
  //       )
  //     case WriteActions.Withdraw:
  //       return poolContract.exchange_underlying.populateTransaction(
  //         0,
  //         2,
  //         amount,
  //         amount * 0.99,
  //       )
  //     default:
  //       throw new Error('Action not supported')
  //   }
  // }

  // protected async getArbitrumParams({
  //   action,
  //   amount,
  // }: {
  //   action: WriteActions
  //   amount: number
  // }): Promise<{ to: string; data: string }> {
  //   const poolContract = CurveStableSwapNg__factory.connect(
  //     '0x4bD135524897333bec344e50ddD85126554E58B4',
  //     this.provider,
  //   )

  //   switch (action) {
  //     case WriteActions.Deposit:
  //       return poolContract.exchange.populateTransaction(
  //         0,
  //         1,
  //         amount,
  //         amount * 0.99,
  //       )
  //     case WriteActions.Withdraw:
  //       return poolContract.exchange.populateTransaction(
  //         1,
  //         0,
  //         amount,
  //         amount * 0.99,
  //       )
  //     default:
  //       throw new Error('Action not supported')
  //   }
  // }

  // protected async getOptimismParams({
  //   action,
  //   amount,
  // }: {
  //   action: WriteActions
  //   amount: number
  // }): Promise<{ to: string; data: string }> {
  //   const poolContract = CurveStableSwapNg__factory.connect(
  //     '0xb52c9213d318956bFa26Df2656B161e3cAcbB64d',
  //     this.provider,
  //   )

  //   switch (action) {
  //     case WriteActions.Deposit:
  //       return poolContract.exchange.populateTransaction(
  //         0,
  //         1,
  //         amount,
  //         amount * 0.99,
  //       )
  //     case WriteActions.Withdraw:
  //       return poolContract.exchange.populateTransaction(
  //         1,
  //         0,
  //         amount,
  //         amount * 0.99,
  //       )
  //     default:
  //       throw new Error('Action not supported')
  //   }
  // }

  // protected async getBaseParams({
  //   action,
  //   amount,
  // }: {
  //   action: WriteActions
  //   amount: number
  // }): Promise<{ to: string; data: string }> {
  //   const poolContract = CurveStableSwapNg__factory.connect(
  //     '0x63eb7846642630456707c3efbb50a03c79b89d81',
  //     this.provider,
  //   )

  //   switch (action) {
  //     case WriteActions.Deposit:
  //       return poolContract.exchange.populateTransaction(
  //         0,
  //         1,
  //         amount,
  //         amount * 0.99,
  //       )
  //     case WriteActions.Withdraw:
  //       return poolContract.exchange.populateTransaction(
  //         1,
  //         0,
  //         amount,
  //         amount * 0.99,
  //       )
  //     default:
  //       throw new Error('Action not supported')
  //   }
  // }

  // protected async getPolygonParams({
  //   action,
  //   amount,
  // }: {
  //   action: WriteActions
  //   amount: number
  // }): Promise<{ to: string; data: string }> {
  //   const poolContract = CurveStableSwapNg__factory.connect(
  //     '0xd8001ce95a13168aa4f7d70b5298962b7cadf6dd',
  //     this.provider,
  //   )

  //   switch (action) {
  //     case WriteActions.Deposit:
  //       return poolContract.exchange.populateTransaction(
  //         0,
  //         1,
  //         amount,
  //         amount * 0.99,
  //       )
  //     case WriteActions.Withdraw:
  //       return poolContract.exchange.populateTransaction(
  //         1,
  //         0,
  //         amount,
  //         amount * 0.99,
  //       )
  //     default:
  //       throw new Error('Action not supported')
  //   }
  // }

  // async getTransactionParams({
  //   action,
  //   inputs,
  // }: Extract<
  //   GetTransactionParams,
  //   { protocolId: typeof Protocol.MountainProtocol; productId: 'usdm' }
  // >): Promise<{ to: string; data: string }> {
  //   const { amount } = inputs
  //   switch (this.chainId) {
  //     case Chain.Arbitrum:
  //       return this.getArbitrumParams({ action, amount })
  //     case Chain.Optimism:
  //       return this.getOptimismParams({ action, amount })
  //     case Chain.Base:
  //       return this.getBaseParams({ action, amount })
  //     case Chain.Polygon:
  //       return this.getPolygonParams({ action, amount })
  //     case Chain.Ethereum:
  //       return this.getEthereumParams({ action, amount })
  //     default:
  //       throw new Error('Action not supported')
  //   }
  // }
}

// export const WriteActionInputs = {
//   [WriteActions.Deposit]: z.object({
//     amount: z.string(),
//   }),
//   [WriteActions.Withdraw]: z.object({
//     amount: z.string(),
//   }),
// } satisfies WriteActionInputSchemas
