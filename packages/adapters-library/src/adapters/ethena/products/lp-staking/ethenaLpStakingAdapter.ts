import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import { EthenaLpStaking__factory } from '../../contracts'

const LP_STAKING_CONTRACT_ADDRESS = getAddress(
  '0x8707f238936c12c309bfc2B9959C35828AcFc512',
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Ethena LP Staking',
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
  async getProtocolTokens(): Promise<ProtocolToken[]> {
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
            underlyingTokens: [],
          }
        },
      ),
    )

    return lpTokens
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
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const lpStakingContract = EthenaLpStaking__factory.connect(
      LP_STAKING_CONTRACT_ADDRESS,
      this.provider,
    )

    const protocolTokens = await this.getProtocolTokens()

    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const userStake = await lpStakingContract.stakes(
        userAddress,
        protocolToken.address,
        { blockTag: blockNumber },
      )

      if (!userStake.stakedAmount) {
        return undefined
      }

      return {
        type: TokenType.Protocol,
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        balanceRaw: userStake.stakedAmount,
      }
    })
  }

  async getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      ...input,
      filterType: 'unstake',
    })
  }

  async getDeposits(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      ...input,
      filterType: 'stake',
    })
  }

  private async getMovements({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
    filterType,
  }: GetEventsInput & {
    filterType: 'stake' | 'unstake'
  }): Promise<MovementsByBlock[]> {
    const protocolTokenPromise =
      this.getProtocolTokenByAddress(protocolTokenAddress)

    const lpStakingContract = EthenaLpStaking__factory.connect(
      LP_STAKING_CONTRACT_ADDRESS,
      this.provider,
    )

    const filter =
      filterType === 'stake'
        ? lpStakingContract.filters.Stake(userAddress, protocolTokenAddress)
        : lpStakingContract.filters.Unstake(userAddress, protocolTokenAddress)

    const events = await lpStakingContract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    const protocolToken = await protocolTokenPromise

    return events.map((event) => {
      const { amount } = event.args!

      return {
        protocolToken: {
          address: protocolToken.address,
          name: protocolToken.name,
          symbol: protocolToken.symbol,
          decimals: protocolToken.decimals,
        },
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        tokens: [
          {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
            type: TokenType.Underlying,
            blockNumber: event.blockNumber,
            balanceRaw: amount,
          },
        ],
      }
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const lpStakingContract = EthenaLpStaking__factory.connect(
      LP_STAKING_CONTRACT_ADDRESS,
      this.provider,
    )

    return await Promise.all(
      (await this.getProtocolTokens())
        .filter(
          (protocolToken) =>
            !protocolTokenAddresses ||
            protocolTokenAddresses.includes(protocolToken.address),
        )
        .map(async (protocolToken) => {
          const stakeParameters =
            await lpStakingContract.stakeParametersByToken(
              protocolToken.address,
              { blockTag: blockNumber },
            )

          return {
            type: TokenType.Protocol,
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
            totalSupplyRaw: stakeParameters.totalStaked,
          }
        }),
    )
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
