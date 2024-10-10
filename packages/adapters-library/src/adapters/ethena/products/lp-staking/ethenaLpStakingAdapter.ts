import { getAddress } from 'ethers'
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
import { EthenaLpStaking__factory } from '../../contracts'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'

/**
 * Update me.
 * Add additional metadata or delete type
 */
type AdditionalMetadata = {}

const LP_STAKING_CONTRACT_ADDRESS = getAddress(
  '0x8707f238936c12c309bfc2B9959C35828AcFc512',
)
const USDDE_TOKEN_ADDRESS = getAddress(
  '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
)

export class EthenaLpStakingAdapter implements IProtocolAdapter {
  productId = 'lp-staking'
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
      name: 'Ethena',
      description: 'Ethena defi adapter',
      siteUrl: 'https://ethena.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x57e114b691db790c35207b2e685d4a43181e6061/logo.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const lpStakingContract = EthenaLpStaking__factory.connect(
      LP_STAKING_CONTRACT_ADDRESS,
      this.provider,
    )

    const filter = lpStakingContract.filters.StakeParametersUpdated()
    const events = await lpStakingContract.queryFilter(filter)

    const lpTokens = await Promise.all(
      [...new Set(events.map((event) => event.args.lpToken))].map(
        async (lpToken) => {
          return {
            ...(await getTokenMetadata(lpToken, this.chainId, this.provider)),
          }
        },
      ),
    )

    console.log(JSON.stringify(lpTokens, null, 2))

    throw new NotImplementedError()
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const lpStakingContract = EthenaLpStaking__factory.connect(
      LP_STAKING_CONTRACT_ADDRESS,
      this.provider,
    )

    const userStake = await lpStakingContract.stakes(
      userAddress,
      USDDE_TOKEN_ADDRESS,
      { blockTag: blockNumber },
    )

    return [
      {
        ...(await getTokenMetadata(
          USDDE_TOKEN_ADDRESS,
          this.chainId,
          this.provider,
        )),
        type: TokenType.Protocol,
        balanceRaw: userStake.stakedAmount,
      },
    ]
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
    const lpStakingContract = EthenaLpStaking__factory.connect(
      LP_STAKING_CONTRACT_ADDRESS,
      this.provider,
    )

    const stakeParameters = await lpStakingContract.stakeParametersByToken(
      USDDE_TOKEN_ADDRESS,
      { blockTag: blockNumber },
    )

    return [
      {
        ...(await getTokenMetadata(
          USDDE_TOKEN_ADDRESS,
          this.chainId,
          this.provider,
        )),
        type: TokenType.Protocol,
        totalSupplyRaw: stakeParameters.totalStaked,
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
