export function blankAdapterTemplate() {
  return `import { getAddress } from 'ethers'
    import { Protocol } from '../../../protocols'
    import { AdaptersController } from '../../../../core/adaptersController'
    import { Chain } from '../../../../core/constants/chains'
    import { CacheToDb } from '../../../../core/decorators/cacheToDb'
    import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
    import { logger } from '../../../../core/utils/logger'
    import {
      AdapterSettings,
      ProtocolAdapterParams,
      ProtocolDetails,
      PositionType,
      AssetType,
      GetPositionsInput,
      ProtocolPosition,
      UnwrapInput,
      UnwrapExchangeRate,
      Underlying,
      GetRewardPositionsInput,
      UnderlyingReward,
    } from '../../../../types/adapter'
    import { Erc20Metadata } from '../../../../types/erc20Metadata'
    import { IProtocolAdapter, ProtocolToken } from '../../../../types/IProtocolAdapter'
    import { Helpers } from '../../../../core/helpers'
    import { NotImplementedError } from '../../../../core/errors/errors'

    /**
     * Update me.
     * Add additional metadata or delete type
     */
    type AdditionalMetadata = {}

    export class ADAPTER_CLASS_NAME implements IProtocolAdapter {
      productId = 'Replacements.PRODUCT_ID.placeholder'
      protocolId: Protocol
      chainId: Chain
      helpers: Helpers

      adapterSettings: AdapterSettings = {
        includeInUnwrap: Replacements.INCLUDE_IN_UNWRAP.placeholder,
        userEvent: Replacements.ENABLE_POSITION_DETECTION_BY_PROTOCOL_TOKEN_TRANSFER.placeholder,
      }

      private provider: CustomJsonRpcProvider

      adaptersController: AdaptersController

      constructor({
        provider,
        chainId,
        protocolId,
        adaptersController,
        helpers,
      }: ProtocolAdapterParams) {
        this.provider = provider
        this.chainId = chainId
        this.protocolId = protocolId
        this.adaptersController = adaptersController
        this.helpers = helpers
      }

      /**
       * Update me.
       * Add your protocol details
       */
      getProtocolDetails(): ProtocolDetails {
        return {
          protocolId: this.protocolId,
          name: 'Replacements.PROTOCOL_KEY.placeholder',
          description: 'Replacements.PROTOCOL_KEY.placeholder defi adapter',
          siteUrl: 'https:',
          iconUrl: 'https://',
          positionType: PositionType.Supply,
          chainId: this.chainId,
          productId: this.productId,
        }
      }

      @CacheToDb
      async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
        return Replacements.GET_PROTOCOL_TOKENS.placeholder
      }

      private async getProtocolTokenByAddress(
        protocolTokenAddress: string,
      ) {
        return this.helpers.getProtocolTokenByAddress({
          protocolTokens: await this.getProtocolTokens(),
          protocolTokenAddress,
        })
      }

      async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
        return Replacements.GET_POSITIONS.placeholder
      }

      async unwrap({
        protocolTokenAddress,
        blockNumber,
      }: UnwrapInput): Promise<UnwrapExchangeRate> {
        return Replacements.UNWRAP.placeholder
      }

      //Replacements.GET_REWARD_POSITIONS.placeholder
    
      //Replacements.GET_EXTRA_REWARD_POSITIONS.placeholder
    }
    `
}
