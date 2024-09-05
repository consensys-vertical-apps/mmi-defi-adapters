import { z } from 'zod'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  PositionType,
  ProtocolDetails,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  WriteActionInputSchemas,
  WriteActions,
} from '../../../../types/writeActions'
import { Protocol } from '../../../protocols'
import { GetTransactionParams } from '../../../supportedProtocols'
import { Wusdm__factory } from '../../contracts'

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
}

const PROTOCOL_TOKEN_ADDRESS = '0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812'
export class MountainProtocolWUsdmAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'wusdm'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
    version: 2,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Mountain Protocol wUSDM',
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
        name: 'Wrapped Mountain Protocol USD',
        symbol: 'wUSDM',
        decimals: 18,
        underlyingTokens: [
          {
            address: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
            name: 'Mountain Protocol USD',
            symbol: 'USDM',
            decimals: 18,
          },
        ],
      },
    ]
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    const wUSDMContract = Wusdm__factory.connect(
      protocolTokenBalance.address,
      this.provider,
    )

    const usdmBalance = await wUSDMContract.convertToAssets(
      protocolTokenBalance.balanceRaw,
      {
        blockTag: blockNumber,
      },
    )

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: usdmBalance,
      },
    ]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    const wUSDMContract = Wusdm__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const pricePerShareRaw = await wUSDMContract.convertToAssets(
      BigInt(1 * 1e18),
      {
        blockTag: blockNumber,
      },
    )

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }

  /**
   * Retrieves transaction parameters for specific actions based on provided inputs.
   *
   * Implementation Steps:
   * 1. Implement logic for handling predefined actions (e.g., Supply, Withdraw). Consider the examples provided as a starting point.
   * 2. For new actions (e.g., Stake, Flash Loan), first extend the \`WriteActions\` object to include these new actions.
   * 3. Export a WriteActionInputs object that satisfies WriteActionInputSchemas from this file.
   * 4. Implement the method logic for each action, extracting necessary inputs and populating transactions accordingly.
   *
   * Example Implementations:
   * - Deposit: Extract 'asset', 'amount', 'onBehalfOf', and 'referralCode' from inputs. Use these to populate transactions with 'poolContract.supply.populateTransaction(...)'.
   * - Withdraw: Follow a similar approach, adapting the parameters and transaction population as necessary for the action.
   *
   * Ensure the implementation supports all main end-user actions. Developers are encouraged to incorporate error handling tailored to specific business logic requirements.
   *
   * TODO: Replace code with actual implementation logic according to your protocol's requirements and the actions supported.
   */
  async getTransactionParams({
    action,
    inputs,
  }: Extract<
    GetTransactionParams,
    { protocolId: typeof Protocol.MountainProtocol; productId: 'wusdm' }
  >): Promise<{ to: string; data: string }> {
    // Example switch case structure for implementation:
    const poolContract = Wusdm__factory.connect(
      '0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812',
      this.provider,
    )

    switch (action) {
      case WriteActions.Deposit: {
        const { amount, to } = inputs
        return poolContract.deposit.populateTransaction(amount, to)
      }
      case WriteActions.Withdraw: {
        const { amount, from } = inputs
        return poolContract.redeem.populateTransaction(amount, from, from)
      }
      default:
        throw new Error('Action not supported')
    }
  }
}

export const WriteActionInputs = {
  [WriteActions.Deposit]: z.object({
    amount: z.string(),
    to: z.string(),
  }),
  [WriteActions.Withdraw]: z.object({
    amount: z.string(),
    from: z.string(),
  }),
} satisfies WriteActionInputSchemas
