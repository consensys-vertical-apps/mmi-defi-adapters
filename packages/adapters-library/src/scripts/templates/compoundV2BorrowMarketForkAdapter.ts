import { Chain } from '../../core/constants/chains'
import { NewAdapterAnswers } from '../newAdapterCommand'
import { BlankAdapterOutcomeOptions, QuestionAnswers } from '../questionnaire'

export function compoundV2BorrowMarketForkAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: {
  protocolKey: string
  adapterClassName: string
  productId: string
  chainKeys: (keyof typeof Chain)[]
}) {
  return `
  import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter'
  import { Chain } from '../../../../core/constants/chains'
  import { CacheToFile } from '../../../../core/decorators/cacheToFile'
  import { NotImplementedError } from '../../../../core/errors/errors'
  import {
    ProtocolDetails,
    PositionType,
  } from '../../../../types/adapter'
  import { Protocol } from '../../../protocols'
  
  export class ${adapterClassName} extends CompoundV2BorrowMarketForkAdapter {
    productId = '${productId}'
  
    contractAddresses: Partial<Record<Chain, { comptrollerAddress: string }>> = {}
  
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
      }
    }
  
    @CacheToFile({ fileKey: 'protocol-token' })
    async buildMetadata() {
      return await super.buildMetadata()
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
  // getTransactionParams({
  //   action,
  //   inputs,
  // }: Extract<
  //   GetTransactionParams,
  //   { protocolId: typeof Protocol.${protocolKey}; productId: '${productId}' }
  // >): Promise<{ to: string; data: string }> {
  //   // Example switch case structure for implementation:
  //   switch (action) {
  //     case WriteActions.Deposit: {
  //       const { asset, amount, onBehalfOf, referralCode } = inputs
  //       return poolContract.supply.populateTransaction(
  //         asset,
  //         amount,
  //         onBehalfOf,
  //         referralCode,
  //       )
  //     }
  //     case WriteActions.Withdraw: {
  //       const { asset, amount, to } = inputs
  //       return poolContract.withdraw.populateTransaction(asset, amount, to)
  //     }
  //   }
  // }
  }

  // export const WriteActionInputs = {
  //   [WriteActions.Deposit]: z.object({}),
  //   [WriteActions.Withdraw]: z.object({}),
  // } satisfies WriteActionInputSchemas
  `
}
