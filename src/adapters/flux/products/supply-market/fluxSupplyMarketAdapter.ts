import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import {
  ProtocolDetails,
  PositionType,
  AssetType,
} from '../../../../types/adapter'
import { GetTransactionParamsInput } from '../../../../types/getTransactionParamsInput'
import { Protocol } from '../../../protocols'
import { contractAddresses } from '../../common/contractAddresses'

export class FluxSupplyMarketAdapter extends CompoundV2SupplyMarketForkAdapter {
  // Expected blocks per year
  static readonly EXPECTED_BLOCKS_PER_YEAR = 2628000

  productId = 'supply-market'

  contractAddresses = contractAddresses

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Flux',
      description: 'Flux supply market adapter',
      siteUrl: 'https://fluxfinance.com',
      iconUrl: 'https://docs.fluxfinance.com/img/favicon.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  /**
   * Retrieves transaction parameters for specific actions based on provided inputs.
   *
   * Implementation Steps:
   * 1. Implement logic for handling predefined actions (e.g., Supply, Withdraw). Consider the examples provided as a starting point.
   * 2. For new actions (e.g., Stake, Flash Loan), first extend the `WriteActions` object to include these new actions.
   * 3. Update `GetTransactionParamsInput` type to include the parameters required for any new actions you add.
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
      GetTransactionParamsInput,
      {
        protocolId: typeof Protocol.Flux
        productId: 'borrow-market'
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

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return await super.buildMetadata()
  }
}

// NOTE: The APY/APR feature has been removed as of March 2024.
// The below contains logic that may be useful for future features or reference. For more context on this decision, refer to ticket [MMI-4731].

//   async getApr({
//     protocolTokenAddress,
//     blockNumber,
//   }: GetAprInput): Promise<ProtocolTokenApr> {
//     const fTokenContract = FToken__factory.connect(
//       protocolTokenAddress,
//       this.provider,
//     )
//     const supplyRatePerBlock = await fTokenContract.supplyRatePerBlock({
//       blockTag: blockNumber,
//     })
//     const apr = this.calculateAPR(Number(supplyRatePerBlock.toString()) / 1e18)
//     return {
//       ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
//       aprDecimal: apr * 100,
//     }
//   }

//   async getApy({
//     protocolTokenAddress,
//     blockNumber,
//   }: GetApyInput): Promise<ProtocolTokenApy> {
//     const fTokenContract = FToken__factory.connect(
//       protocolTokenAddress,
//       this.provider,
//     )
//     const supplyRatePerBlock = await fTokenContract.supplyRatePerBlock({
//       blockTag: blockNumber,
//     })
//     const apy = this.calculateAPY(Number(supplyRatePerBlock.toString()) / 1e18)
//     return {
//       ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
//       apyDecimal: apy * 100,
//     }
//   }

//   private calculateAPY(
//     interestAccruedPerInterval: number, // Pass in fToken.borrowRate or fToken.supplyRate
//     intervalsPerYear: number = FluxSupplyMarketAdapter.EXPECTED_BLOCKS_PER_YEAR,
//   ): number {
//     return Math.pow(1 + interestAccruedPerInterval, intervalsPerYear) - 1
//   }

//   private calculateAPR(
//     interestAccruedPerInterval: number, // Pass in fToken.borrowRate or fToken.supplyRate
//     intervalsPerYear: number = FluxSupplyMarketAdapter.EXPECTED_BLOCKS_PER_YEAR,
//   ): number {
//     return interestAccruedPerInterval * intervalsPerYear
//   }
// }
