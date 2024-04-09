import { NewAdapterAnswers } from '../newAdapterCommand'

export function uniswapV2PoolForkAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
  chainKeys,
}: NewAdapterAnswers) {
  return `
  import {
    UniswapV2PoolForkAdapter,
    UniswapV2PoolForkMetadataBuilder,
  } from '../../../../core/adapters/UniswapV2PoolForkAdapter'
  import { Chain } from '../../../../core/constants/chains'
  import { CacheToFile } from '../../../../core/decorators/cacheToFile'
  import { NotImplementedError } from '../../../../core/errors/errors'
  import {
    ProtocolDetails,
    PositionType,
    AssetType,
  } from '../../../../types/adapter'
  import { Protocol } from '../../../protocols'
  
  export class ${adapterClassName} extends UniswapV2PoolForkAdapter {
    productId = '${productId}'
  
    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} pool adapter',
        siteUrl: '',
        iconUrl: '',
        positionType: PositionType.Supply,
        chainId: this.chainId,
        productId: this.productId,
        assetDetails: {
          type: AssetType.StandardErc20,
        },
      }
    }
  
    protected chainMetadataSettings(): Partial<
      Record<Chain, UniswapV2PoolForkMetadataBuilder>
    > {
      // TODO - For each supported chain, provide the settings needed to build the list of pools
      // If using subgraph (recommended for forks with an available subgraph), provide the subgraph URL and factory cotract address
      // If using factory contract (recommended when subgraph is no available), provide the factory contract address
      return {
        ${chainKeys
          .map((chainKey, i) => {
            const metadataBuilderType =
              i === 0
                ? `type: 'graphql',
          subgraphUrl:
            'https://api.thegraph.com/subgraphs/name/<SUBGRAPH-PATH>',
          factoryAddress: '<FACTORY-CONTRACT-ADDRESS>',`
                : `type: 'factory',
              factoryAddress: '<FACTORY-CONTRACT-ADDRESS>',`

            return `[Chain.${chainKey}]: {
          ${metadataBuilderType}
        }`
          })
          .join(',')}
      }
    }
  
    @CacheToFile({ fileKey: 'protocol-token' })
    async buildMetadata() {
      return super.buildMetadata()
    }

    /**
   * Retrieves transaction parameters for specific actions based on provided inputs.
   *
   * Implementation Steps:
   * 1. Implement logic for handling predefined actions (e.g., Supply, Withdraw). Consider the examples provided as a starting point.
   * 2. For new actions (e.g., Stake, Flash Loan), first extend the \`WriteActions\` object to include these new actions.
   * 3. Export WriteActionInputs, GetTransactionParamsSchema and GetTransactionParams from this file.
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
  // }: GetTransactionParams): Promise<{ to: string; data: string }> {
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
  `
}
