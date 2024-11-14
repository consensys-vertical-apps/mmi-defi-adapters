import { ethers, getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  MovementsByBlockReward,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { addresses } from '../lending/compoundV3LendingAdapter'
import { CompoundV3__factory } from '../../contracts'
import { filterMapAsync } from '../../../../core/utils/filters'


export class CompoundV3BorrowAdapter implements IProtocolAdapter {
  productId = 'borrow'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
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
      name: 'CompoundV3',
      description: 'CompoundV3 defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {

    const protocolTokens: ProtocolToken[] = []

    const chainAddresses = addresses[this.chainId as keyof typeof addresses]

    for (const [compoundName, compoundAddress] of Object.entries(chainAddresses)) {


      const compoundFactory = CompoundV3__factory.connect(compoundAddress, this.provider)

      const baseToken = await compoundFactory.baseToken()

      const baseTokenDetails = await this.helpers.getTokenMetadata(baseToken)


      const protocolToken: ProtocolToken = {
        ...baseTokenDetails,
        address: compoundAddress,
        symbol: compoundName,
        name: compoundName,
        underlyingTokens: [
          baseTokenDetails,
        ],
      }

      protocolTokens.push(protocolToken)
    }


    return protocolTokens
  }




  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens();
    const result = await filterMapAsync(protocolTokens, async ({ underlyingTokens, ...protocolToken }) => {
      const compoundFactory = CompoundV3__factory.connect(protocolToken.address, this.provider);
      const userBalance = await compoundFactory.borrowBalanceOf(input.userAddress);


      if (userBalance > 0) {
        return {
          balanceRaw: 1n,
          ...protocolToken,
          type: TokenType.Protocol,
          tokens: [{
            ...underlyingTokens[0]!,
            balanceRaw: userBalance,
            type: TokenType.Underlying
          }]
        } as ProtocolPosition;
      }

      return undefined;
    });

    return result;
  }


  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
    })
  }
}
