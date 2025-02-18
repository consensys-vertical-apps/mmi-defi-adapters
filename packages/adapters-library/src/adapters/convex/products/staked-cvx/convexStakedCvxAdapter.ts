import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
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
import { ConvexRewardPool__factory } from '../../contracts'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class ConvexStakedCvxAdapter implements IProtocolAdapter {
  productId = 'staked-cvx'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: {
      topic0:
        '0x9e71bc8eea02a63969f509818f2dafb9254532904319f9dbda79b67bd34a5f3d',
      userAddressIndex: 1,
    },
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
      description: 'Convex adapter for staked CVX',
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
    const poolAddress = getAddress('0xCF50b810E57Ac33B91dCF525C6ddd9881B139332')
    const cvxTokenAddress = '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'
    const crvCvxTokenAddress = '0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7'

    const [underlyingToken, rewardToken] = await Promise.all([
      this.helpers.getTokenMetadata(cvxTokenAddress),
      this.helpers.getTokenMetadata(crvCvxTokenAddress),
    ])

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
    throw new NotImplementedError()
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { underlyingTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return this.helpers.unwrapOneToOne({
      protocolToken,
      underlyingTokens,
    })
  }

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { address, rewardTokens } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const stakerContract = ConvexRewardPool__factory.connect(
      address,
      this.provider,
    )

    const rewardsBalance = await stakerContract.earned(userAddress, {
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
