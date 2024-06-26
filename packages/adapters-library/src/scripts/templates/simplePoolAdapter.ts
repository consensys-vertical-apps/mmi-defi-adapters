import { Chain } from '../../core/constants/chains'
import { QuestionAnswers } from '../questionnaire'

export function simplePoolAdapterTemplate({
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
  import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
  import {
    IMetadataBuilder,
    CacheToFile,
  } from '../../../../core/decorators/cacheToFile'
  import { NotImplementedError } from '../../../../core/errors/errors'
  import { logger } from '../../../../core/utils/logger'
  import {
    ProtocolDetails,
    PositionType,
    GetEventsInput,
    MovementsByBlock,
    GetTotalValueLockedInput,
    TokenBalance,
    ProtocolTokenTvl,
    UnwrappedTokenExchangeRate,
    Underlying,
  } from '../../../../types/adapter'
  import { Erc20Metadata } from '../../../../types/erc20Metadata'
  import { Protocol } from '../../../protocols'
  
  type ${adapterClassName}Metadata = Record<
    string,
    {
      protocolToken: Erc20Metadata
      underlyingTokens: Erc20Metadata[]
    }
  >
  
  export class ${adapterClassName}
    extends SimplePoolAdapter
    implements IMetadataBuilder
  {
    productId = '${productId}'
  
    /**
     * Update me.
     * Add your protocol details
     */
    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} pool adapter',
        siteUrl: 'https:',
        iconUrl: 'https://',
        positionType: PositionType.Supply,
        chainId: this.chainId,
        productId: this.productId,
      }
    }
  
    /**
     * Update me.
     * Add logic to build protocol token metadata
     * For context see dashboard example ./dashboard.png
     * We need protocol token names, decimals, and also linked underlying tokens
     */
    @CacheToFile({ fileKey: 'protocol-token' })
    async buildMetadata() {
      return {} as ${adapterClassName}Metadata
    }
  
    /**
     * Update me.
     * Below implementation might fit your metadata if not update it.
     */
    async getProtocolTokens(): Promise<Erc20Metadata[]> {
      return Object.values(await this.buildMetadata()).map(
        ({ protocolToken }) => protocolToken,
      )
    }
  
    /**
     * Update me.
     * Add logic to turn the LP token balance into the correct underlying token(s) balance
     * For context see dashboard example ./dashboard.png
     */
    protected async getUnderlyingTokenBalances(_input: {
      userAddress: string
      protocolTokenBalance: TokenBalance
      blockNumber?: number
    }): Promise<Underlying[]> {
      throw new NotImplementedError()
    }
  
    /**
     * Update me.
     * Add logic to find tvl in a pool
     *
     */
    async getTotalValueLocked(
      _input: GetTotalValueLockedInput,
    ): Promise<ProtocolTokenTvl[]> {
      throw new NotImplementedError()
    }
  
    /**
     * Update me.
     * Below implementation might fit your metadata if not update it.
     */
    protected async fetchProtocolTokenMetadata(
      protocolTokenAddress: string,
    ): Promise<Erc20Metadata> {
      const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)
  
      return protocolToken
    }
  
    /**
     * Update me.
     * Add logic that finds the underlying token rates for 1 protocol token
     */
    protected async unwrapProtocolToken(
      _protocolTokenMetadata: Erc20Metadata,
      _blockNumber?: number | undefined,
    ): Promise<UnwrappedTokenExchangeRate[]> {
      throw new NotImplementedError()
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
  
    /**
     * Update me.
     * Below implementation might fit your metadata if not update it.
     */
    protected async fetchUnderlyingTokensMetadata(
      protocolTokenAddress: string,
    ): Promise<Erc20Metadata[]> {
      const { underlyingTokens } = await this.fetchPoolMetadata(
        protocolTokenAddress,
      )
  
      return underlyingTokens
    }
  
    /**
     * Update me.
     * Below implementation might fit your metadata if not update it.
     */
    private async fetchPoolMetadata(protocolTokenAddress: string) {
      const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]
  
      if (!poolMetadata) {
              logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
        throw new Error('Protocol token pool not found')
      }
  
      return poolMetadata
    }
  }

  // export const WriteActionInputs = {
  //   [WriteActions.Deposit]: z.object({}),
  //   [WriteActions.Withdraw]: z.object({}),
  // } satisfies WriteActionInputSchemas
  `
}
