import { NewAdapterAnswers } from '../newAdapterCommand'

export function compoundV2BorrowMarketForkAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: NewAdapterAnswers) {
  return `import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter'
  import { CacheToFile } from '../../../../core/decorators/cacheToFile'
  import { NotImplementedError } from '../../../../core/errors/errors'
  import {
    ProtocolDetails,
    PositionType,
    AssetType,
  } from '../../../../types/adapter'
  import { GetTransactionParamsInput, WriteActions } from '../../../../types/getTransactionParamsInput'
  import { Protocol } from '../../../protocols'
  
  export class ${adapterClassName} extends CompoundV2BorrowMarketForkAdapter {
    productId = '${productId}'
  
    contractAddresses = {}
  
    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} borrow market adapter',
        siteUrl: '',
        iconUrl: '',
        positionType: PositionType.Borrow,
        chainId: this.chainId,
        productId: this.productId,
        assetDetails: {
          type: AssetType.NonStandardErc20,
        },
      }
    }

    /**
     * Retrieves transaction parameters for specific actions based on provided inputs.
     *
     * Implementation Steps:
     * 1. Implement logic for handling predefined actions (e.g., Supply, Withdraw). Consider the examples provided as a starting point.
     * 2. For new actions (e.g., Stake, Flash Loan), first extend the 'WriteActions' object to include these new actions.
     * 3. Update 'GetTransactionParamsInput' type to include the parameters required for any new actions you add.
     * 4. Implement the method logic for each action, extracting necessary inputs and populating transactions accordingly.
     *
     * Example Implementations:
     * - Supply: Extract 'asset', 'amount', 'onBehalfOf', and 'referralCode' from inputs. Use these to populate transactions with 'poolContract.supply.populateTransaction(...)'.
     * - Withdraw: Follow a similar approach, adapting the parameters and transaction population as necessary for the action.
     *
     * Ensure the implementation supports all main end-user actions. Developers are encouraged to incorporate error handling tailored to specific business logic requirements.
     *
     * TODO: Replace the 'NotImplementedError' with actual implementation logic according to your protocol's requirements and the actions supported.
     */
    getTransactionParams(
      _inputs: Extract<
        GetTransactionParamsInput,
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
    getTransactionParams({
      action,
      inputs,
    }: Extract<
      GetTransactionParamsInput,
      {
        protocolId: typeof Protocol.${protocolKey}
        productId: '${productId}'
      }
    >): Promise<{ to: string; data: string }> {
      throw new NotImplementedError()
      // Example switch case structure for implementation:
      // switch (action) {
      //   case WriteActions.Deposit: {
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
  
    @CacheToFile({ fileKey: 'protocol-token' })
    async buildMetadata() {
      return await super.buildMetadata()
    }
  }
  `
}
