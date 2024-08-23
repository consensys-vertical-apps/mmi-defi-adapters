import { Chain } from '../../core/constants/chains'
import { BlankAdapterOutcomeOptions, QuestionAnswers } from '../questionnaire'

export function blankAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: {
  protocolKey: string
  adapterClassName: string
  productId: string
  chainKeys: (keyof typeof Chain)[]
}) {
  return `import { getAddress } from 'ethers'
    import { Protocol } from '../../../protocols'
    import { AdaptersController } from '../../../../core/adaptersController'
    import { Chain } from '../../../../core/constants/chains'
    import { CacheToFile } from '../../../../core/decorators/cacheToFile'
    import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
    import { logger } from '../../../../core/utils/logger'
    import {
      ProtocolAdapterParams,
      ProtocolDetails,
      PositionType,
      AssetType,
      GetPositionsInput,
      ProtocolPosition,
      GetEventsInput,
      MovementsByBlock,
      GetTotalValueLockedInput,
      ProtocolTokenTvl,
      UnwrapInput,
      UnwrapExchangeRate,
      Underlying,
      GetRewardPositionsInput,
      UnderlyingReward,
    } from '../../../../types/adapter'
    import { Erc20Metadata } from '../../../../types/erc20Metadata'
    import { IProtocolAdapter, ProtocolToken } from '../../../../types/IProtocolAdapter'
    import { Helpers } from '../../../../scripts/helpers'
    import { RewardsAdapter } from '../../../../scripts/rewardAdapter'
    import { NotImplementedError } from '../../../../core/errors/errors'
    import { Replacements } from '../../../../scripts/replacements'

    type AdditionalMetadata = { underlyingTokens: Erc20Metadata[] }

    export class ADAPTER_CLASS_NAME implements IProtocolAdapter {
      productId = 'Replacements.PRODUCT_ID.placeholder'
      protocolId: Protocol
      chainId: Chain
      helpers: Helpers

      adapterSettings = {
        version: 2,
        enablePositionDetectionByProtocolTokenTransfer: Replacements.ENABLE_POSITION_DETECTION_BY_PROTOCOL_TOKEN_TRANSFER.placeholder,
        includeInUnwrap: Replacements.INCLUDE_IN_UNWRAP.placeholder,
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

      @CacheToFile({ fileKey: 'protocol-token' })
      async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
        return Replacements.GET_PROTOCOL_TOKENS.placeholder
      }

      private async getProtocolTokenByAddress(
        protocolTokenAddress: string,
      ): Promise<ProtocolToken<AdditionalMetadata>> {
        return this.helpers.getProtocolTokenByAddress({
          protocolTokens: await this.getProtocolTokens(),
          protocolTokenAddress,
        })
      }

      async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
        return Replacements.GET_POSITIONS.placeholder
      }

      async getWithdrawals({
        protocolTokenAddress,
        fromBlock,
        toBlock,
        userAddress,
      }: GetEventsInput): Promise<MovementsByBlock[]> {
        return Replacements.GET_WITHDRAWALS.placeholder
      }

      async getDeposits({
        protocolTokenAddress,
        fromBlock,
        toBlock,
        userAddress,
      }: GetEventsInput): Promise<MovementsByBlock[]> {
        return Replacements.GET_DEPOSITS.placeholder
      }

      async getTotalValueLocked({
        protocolTokenAddresses,
        blockNumber,
      }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
        return Replacements.TVL.placeholder
      }

      async unwrap({
        protocolTokenAddress,
        tokenId,
        blockNumber,
      }: UnwrapInput): Promise<UnwrapExchangeRate> {
        return Replacements.UNWRAP.placeholder
      }

      //Replacements.GET_REWARD_POSITIONS.placeholder
    
      //Replacements.GET_REWARD_WITHDRAWALS.placeholder
    
      //Replacements.GET_EXTRA_REWARD_POSITIONS.placeholder
    
      //Replacements.GET_EXTRA_REWARD_WITHDRAWALS.placeholder
    }
    `
}
