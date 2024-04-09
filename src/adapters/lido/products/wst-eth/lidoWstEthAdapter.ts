import { getAddress } from 'ethers'
import { GetTransactionParams } from '../../..'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolDetails,
  PositionType,
  TokenType,
  TokenBalance,
  Underlying,
  UnwrappedTokenExchangeRate,
  AssetType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { WstEthToken__factory } from '../../contracts'

export class LidoWstEthAdapter extends SimplePoolAdapter {
  productId = 'wst-eth'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Lido wstEth',
      description: 'Lido defi adapter for wstEth',
      siteUrl: 'https://stake.lido.fi/wrap',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84/logo.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [await this.fetchProtocolTokenMetadata()]
  }

  protected async fetchProtocolTokenMetadata(): Promise<Erc20Metadata> {
    const wstEthAddress = getAddress(
      '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    )
    return await getTokenMetadata(wstEthAddress, this.chainId, this.provider)
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    const stEthAddress = getAddress(
      '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    )
    return [await getTokenMetadata(stEthAddress, this.chainId, this.provider)]
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      protocolTokenBalance.address,
      this.provider,
    )

    const stEthBalance = await wstEthContract.getStETHByWstETH(
      protocolTokenBalance.balanceRaw,
      {
        blockTag: blockNumber,
      },
    )

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: stEthBalance,
      },
    ]
  }

  /**
   * Retrieves transaction parameters for specific actions based on provided inputs.
   *
   * Implementation Steps:
   * 1. Implement logic for handling predefined actions (e.g., Supply, Withdraw). Consider the examples provided as a starting point.
   * 2. For new actions (e.g., Stake, Flash Loan), first extend the `WriteActions` object to include these new actions.
   * 3. Export WriteActionInputs, GetTransactionParamsSchema and GetTransactionParams from this file.
   * 4. Implement the method logic for each action, extracting necessary inputs and populating transactions accordingly.
   *
   * Example Implementations:
   * - Supply: Extract 'asset', 'amount', 'onBehalfOf', and 'referralCode' from inputs. Use these to populate transactions with 'poolContract.supply.populateTransaction(...)'.
   * - Withdraw: Follow a similar approach, adapting the parameters and transaction population as necessary for the action.
   *
   * Ensure the implementation supports all main end-user actions. Developers are encouraged to incorporate error handling tailored to specific business logic requirements.
   *
   * TODO: Replace the `NotImplementedError` with actual implementation logic according to your protocol's requirements and the actions supported.
   */
  getTransactionParams(
    _inputs: Extract<
      GetTransactionParams,
      {
        protocolId: typeof Protocol.Lido
        productId: 'st-eth'
      }
    >,
  ): Promise<{ to: string; data: string }> {
    throw new NotImplementedError()
    // Example switch case structure for implementation:
    // switch (action) {
    //   case WriteActions.Supply: {
    //     const { asset, amount, onBehalfOf, referralCode } = inputs;
    //     return poolContract.supply.populateTransaction(
    //       asset, amount, onBehalfOf, referralCode,
    //     );
    //   }
    //   case WriteActions.Withdraw: {
    //     // const { asset, amount, to } = inputs;
    //     // return poolContract.withdraw.populateTransaction(asset, amount, to);
    //   }
    //   default:
    //     throw new Error('Method not supported');
    // }
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const pricePerShareRaw = await wstEthContract.stEthPerToken({
      blockTag: blockNumber,
    })

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
