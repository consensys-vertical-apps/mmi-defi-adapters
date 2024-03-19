import { NewAdapterAnswers } from '../newAdapterCommand'

export function defaultAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: NewAdapterAnswers) {
  return `import { AdaptersController } from '../../../../core/adaptersController'
  import { Chain } from '../../../../core/constants/chains'
  import {
    IMetadataBuilder,
    CacheToFile,
  } from '../../../../core/decorators/cacheToFile'
  import { NotImplementedError } from '../../../../core/errors/errors'
  import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
  import {
    ProtocolAdapterParams,
    ProtocolDetails,
    PositionType,
    GetPositionsInput,
    GetEventsInput,
    MovementsByBlock,
    GetTotalValueLockedInput,
    GetApyInput,
    GetAprInput,
    GetConversionRateInput,
    ProtocolTokenApr,
    ProtocolTokenApy,
    ProtocolTokenUnderlyingRate,
    ProtocolTokenTvl,
    ProtocolPosition,
    AssetType,
  } from '../../../../types/adapter'
  import { Erc20Metadata } from '../../../../types/erc20Metadata'
  import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
  import { Protocol } from '../../../protocols'
  import { GetTransactionParamsInput, WriteActions } from '../../../../types/getTransactionParamsInput'
  
  export class ${adapterClassName} implements IProtocolAdapter, IMetadataBuilder {
    productId = '${productId}'
    protocolId: Protocol
    chainId: Chain
  
    private provider: CustomJsonRpcProvider

    adaptersController: AdaptersController
  
    constructor({
      provider,
      chainId,
      protocolId,
      adaptersController,
    }: ProtocolAdapterParams) {
      this.provider = provider
      this.chainId = chainId
      this.protocolId = protocolId
      this.adaptersController = adaptersController
    }
  
    /**
     * Update me.
     * Add your protocol details
     */
    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} defi adapter',
        siteUrl: 'https:',
        iconUrl: 'https://',
        positionType: PositionType.Supply,
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
   * 1. Implement logic for handling predefined actions (e.g., Deposit, Withdraw). Consider the examples provided as a starting point.
   * 2. For new actions (e.g., Stake, Flash Loan, Swap), first extend the 'WriteActions' object to include these new actions.
   * 3. Update 'GetTransactionParamsInput' type to include the parameters required for any new actions you add.
   * 4. Implement the method logic for each action, extracting necessary inputs and populating transactions accordingly.
   *
   * Example implementations from thr Aave V3 adapter:
   * - Deposit: Extract 'asset', 'amount', 'onBehalfOf', and 'referralCode' from inputs. Use these to populate transactions with 'poolContract.supply.populateTransaction(...)'.
   * - Withdraw: Follow a similar approach, adapting the parameters and transaction population as necessary for the action.
   *
   * Ensure your implementation handles all supported actions comprehensively and provides clear error messaging for unsupported actions.
   *
   * TODO: Replace the 'NotImplementedError' with actual implementation logic according to your protocol's requirements and the actions supported.
   */
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
  
    /**
     * Update me.
     * Add logic to build protocol token metadata
     * For context see dashboard example ./dashboard.png
     * We need protocol token names, decimals, and also linked underlying tokens
     */
    @CacheToFile({ fileKey: 'protocol-token' })
    async buildMetadata() {
      throw new NotImplementedError()
  
      return {}
    }
  
    /**
     * Update me.
     * Returning an array of your protocol tokens.
     */
    async getProtocolTokens(): Promise<Erc20Metadata[]> {
      throw new NotImplementedError()
    }
  
    /**
     * Update me.
     * Add logic to get userAddress positions in your protocol
     */
    async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
      throw new NotImplementedError()
    }
  
    /**
     * Update me.
     * Add logic to get user's withdrawals per position by block range
     */
    async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
      throw new NotImplementedError()
    }
  
    /**
     * Update me.
     * Add logic to get user's deposits per position by block range
     */
    async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
      throw new NotImplementedError()
    }
  
    /**
     * Update me.
     * Add logic to get tvl in a pool
     *
     */
    async getTotalValueLocked(
      _input: GetTotalValueLockedInput,
    ): Promise<ProtocolTokenTvl[]> {
      throw new NotImplementedError()
    }
  
    /**
     * Update me.
     * Add logic to calculate the underlying token rate of 1 protocol token
     */
    async getProtocolTokenToUnderlyingTokenRate(
      _input: GetConversionRateInput,
    ): Promise<ProtocolTokenUnderlyingRate> {
      throw new NotImplementedError()
    }
  
    async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
      throw new NotImplementedError()
    }
  
    async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
      throw new NotImplementedError()
    }
  }`
}
