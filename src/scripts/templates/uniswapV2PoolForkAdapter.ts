import { NewAdapterAnswers } from '../newAdapterCommand'

export function uniswapV2PoolForkAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
  chainKeys,
}: NewAdapterAnswers) {
  return `import {
    UniswapV2PoolForkAdapter,
    UniswapV2PoolForkMetadataBuilder,
  } from '../../../../core/adapters/UniswapV2PoolForkAdapter'
  import { Chain } from '../../../../core/constants/chains'
  import { CacheToFile } from '../../../../core/decorators/cacheToFile'
  import {
    ProtocolDetails,
    PositionType,
    AssetType,
  } from '../../../../types/adapter'
  
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
  }  
  `
}
