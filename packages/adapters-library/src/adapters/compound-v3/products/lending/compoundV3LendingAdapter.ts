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
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { CompoundV3__factory } from '../../contracts'



export const addresses = {
  [Chain.Ethereum]: {
    'cUSDCv3': "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
    'cWETHv3': "0xA17581A9E3356d9A858b789D68B4d866e593aE94",
    'cUSDTv3': "0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840",
    'cwstETHv3': "0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3",
    'cUSDSv3': "0x5D409e56D886231aDAf00c8775665AD0f9897b56",
  },
  [Chain.Polygon]: {
    'cUSDCv3': "0xF25212E676D1F7F89Cd72fFEe66158f541246445",

    'cUSDTv3': "0xaeB318360f27748Acb200CE616E389A6C9409a07",

  },
  [Chain.Arbitrum]: {
    'cUSDCv3': "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf",
    'cUSDCev3': "0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA",

    'cWETHv3': "0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486",
    'cUSDTv3': "0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07",
  },
  [Chain.Base]: {
    'cUSDCv3': "0xb125E6687d4313864e53df431d5425969c15Eb2F",
    'cUSDCbv3': "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf",

    'cWETHv3': "0x46e6b214b524310239732D51387075E0e70970bf",
    'cAEROv3': "0x784efeB622244d2348d4F2522f8860B96fbEcE89",
  },
  [Chain.Optimism]: {
    'cUSDCv3': "0x2e44e174f7D53F0212823acC11C01A11d58c5bCB",
    'cUSDTv3': "0x995E394b8B2437aC8Ce61Ee0bC610D617962B214",
    'cWETHv3': "0xE36A30D249f7761327fd973001A32010b521b6Fd",
  }
}


export class CompoundV3LendingAdapter implements IProtocolAdapter {
  productId = 'lending'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
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

  async getPositions({
    userAddress,
    protocolTokenAddresses,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      userAddress,
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddresses,
      blockNumber,
    })
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

  // async getRewardPositions({
  //   userAddress,
  //   protocolTokenAddress,
  //   blockNumber,
  //   tokenId,
  // }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
  //   throw new NotImplementedError()
  // }

  // async getRewardWithdrawals({
  //   userAddress,
  //   protocolTokenAddress,
  // }: GetEventsInput): Promise<MovementsByBlockReward[]> {
  //   throw new NotImplementedError()
  // }
}
