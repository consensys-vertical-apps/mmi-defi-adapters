import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
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
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { ConvexRewardPool__factory } from '../../contracts'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class ConvexStakedCvxAdapter implements IProtocolAdapter {
  productId = 'staked-cvx'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
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
      name: 'Convex',
      description: 'Convex adapter for CVX staking',
      siteUrl: 'https://curve.convexfinance.com/stake',
      iconUrl: buildTrustAssetIconUrl(
        Chain.Ethereum,
        '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
      ),
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const [underlyingToken, rewardToken] = await Promise.all([
      this.helpers.getTokenMetadata(
        '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
      ),
      this.helpers.getTokenMetadata(
        '0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7',
      ),
    ])
    const poolAddress = getAddress('0xCF50b810E57Ac33B91dCF525C6ddd9881B139332')

    return [
      {
        address: poolAddress,
        name: 'Staked CVX',
        symbol: 'stkCVX',
        decimals: underlyingToken.decimals,
        underlyingTokens: [underlyingToken],
        rewardTokens: [rewardToken],
      },
    ]
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
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
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
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

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { address, rewardTokens } = this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })

    const contract = ConvexRewardPool__factory.connect(address, this.provider)

    const rewardsBalance = await contract.earned(userAddress, {
      blockTag: blockNumber,
    })

    return [
      {
        ...rewardTokens[0]!,
        balanceRaw: rewardsBalance,
        type: TokenType.UnderlyingClaimable,
      },
    ]
  }

  async getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlockReward[]> {
    throw new NotImplementedError()
  }
}
