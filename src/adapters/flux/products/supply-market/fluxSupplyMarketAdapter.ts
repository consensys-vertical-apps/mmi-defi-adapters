import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  ProtocolDetails,
  PositionType,
  AssetType,
  GetAprInput,
  GetApyInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
} from '../../../../types/adapter'
import { contractAddresses } from '../../common/contractAddresses'
import { FToken__factory } from '../../contracts'

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

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return await super.buildMetadata()
  }

  async getApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<ProtocolTokenApr> {
    const fTokenContract = FToken__factory.connect(
      protocolTokenAddress,
      this.provider,
    )
    const supplyRatePerBlock = await fTokenContract.supplyRatePerBlock({
      blockTag: blockNumber,
    })
    const apr = this.calculateAPR(Number(supplyRatePerBlock.toString()) / 1e18)
    return {
      ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
      aprDecimal: apr * 100,
    }
  }

  async getApy({
    protocolTokenAddress,
    blockNumber,
  }: GetApyInput): Promise<ProtocolTokenApy> {
    const fTokenContract = FToken__factory.connect(
      protocolTokenAddress,
      this.provider,
    )
    const supplyRatePerBlock = await fTokenContract.supplyRatePerBlock({
      blockTag: blockNumber,
    })
    const apy = this.calculateAPY(Number(supplyRatePerBlock.toString()) / 1e18)
    return {
      ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
      apyDecimal: apy * 100,
    }
  }

  private calculateAPY(
    interestAccruedPerInterval: number, // Pass in fToken.borrowRate or fToken.supplyRate
    intervalsPerYear: number = FluxSupplyMarketAdapter.EXPECTED_BLOCKS_PER_YEAR,
  ): number {
    return Math.pow(1 + interestAccruedPerInterval, intervalsPerYear) - 1
  }

  private calculateAPR(
    interestAccruedPerInterval: number, // Pass in fToken.borrowRate or fToken.supplyRate
    intervalsPerYear: number = FluxSupplyMarketAdapter.EXPECTED_BLOCKS_PER_YEAR,
  ): number {
    return interestAccruedPerInterval * intervalsPerYear
  }
}
