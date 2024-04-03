import {
  FeeDistributor__factory,
  VotingEscrow__factory,
} from '../../adapters/curve/contracts'
import { Protocol } from '../../adapters/protocols'
import { Erc20__factory } from '../../contracts'
import { AdaptersController } from '../../core/adaptersController'
import { Chain } from '../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../core/provider/CustomJsonRpcProvider'
import { getErc20Movements } from '../../core/utils/erc20Movements'
import { getTokenMetadata } from '../../core/utils/getTokenMetadata'
import { unixTimestampToDateString } from '../../core/utils/unixTimestampToDateString'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  AssetType,
  GetPositionsInput,
  Underlying,
  TokenType,
  UnwrapInput,
  ProtocolPosition,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  ProtocolTokenTvl,
  UnwrapExchangeRate,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'

type IProtocolToken = {
  protocolToken: Erc20Metadata
  underlyingToken: Erc20Metadata
  rewardToken: Erc20Metadata
}

export abstract class CurveVotingEscrow
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'voting-escrow'
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Curve',
      description: 'Curve defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  abstract addresses: {
    veToken: string
    underlyingToken: string
    rewardToken: string
    feeDistributor: string
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<IProtocolToken> {
    return {
      protocolToken: await getTokenMetadata(
        this.addresses.veToken,
        this.chainId,
        this.provider,
      ),
      underlyingToken: await getTokenMetadata(
        this.addresses.underlyingToken,
        this.chainId,
        this.provider,
      ),
      rewardToken: await getTokenMetadata(
        this.addresses.rewardToken,
        this.chainId,
        this.provider,
      ),
    }
  }

  async getRewardPosition({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<Underlying> {
    const feeDistributor = FeeDistributor__factory.connect(
      this.addresses.feeDistributor,
      this.provider,
    )

    const balance = await feeDistributor['claim(address)'].staticCall(
      userAddress,
      { blockTag: blockNumber, from: userAddress },
    )

    return {
      ...(await this.fetchRewardToken()),
      balanceRaw: balance,
      type: TokenType.UnderlyingClaimable,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [(await this.buildMetadata()).protocolToken]
  }
  async fetchProtocolToken(): Promise<Erc20Metadata> {
    return (await this.buildMetadata()).protocolToken
  }
  async fetchUnderlyingToken(): Promise<Erc20Metadata> {
    return (await this.buildMetadata()).underlyingToken
  }
  async fetchRewardToken(): Promise<Erc20Metadata> {
    return (await this.buildMetadata()).rewardToken
  }

  async unwrappedBalance(
    input: UnwrapInput & { protocolTokenBalance: bigint },
  ): Promise<Underlying> {
    const { tokens } = await this.unwrap(input)

    const { underlyingRateRaw, ...underlyingTokenMetadata } = tokens![0]!

    return {
      ...underlyingTokenMetadata,
      balanceRaw:
        (input.protocolTokenBalance * underlyingRateRaw) /
        10n ** BigInt(underlyingTokenMetadata.decimals),
    }
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const votingEscrow = VotingEscrow__factory.connect(
      this.addresses.veToken,
      this.provider,
    )

    const lockedDetailsPromise = await votingEscrow.locked(userAddress, {
      blockTag: blockNumber,
    })

    const protocolTokenPromise = this.fetchProtocolToken()

    const [{ amount, end }, protocolToken] = await Promise.all([
      lockedDetailsPromise,
      protocolTokenPromise,
    ])

    if (amount == 0n) {
      return []
    }

    const rewardPosition = await this.getRewardPosition({
      userAddress,
      blockNumber,
    })

    const unwrappedToken = await this.unwrappedBalance({
      protocolTokenBalance: amount,
      protocolTokenAddress: this.addresses.veToken,
      blockNumber,
    })

    const nameWithUnlockTime =
      protocolToken.name + ` - Unlock time ${unixTimestampToDateString(end)}`

    const tokens = [unwrappedToken]

    if (rewardPosition.balanceRaw > 0n) {
      tokens.push(rewardPosition)
    }

    return [
      {
        type: TokenType.Protocol,
        balanceRaw: amount,
        ...protocolToken,
        name: nameWithUnlockTime,
        tokens,
      },
    ]
  }

  async getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return (
      await Promise.all([
        getErc20Movements({
          protocolToken: await this.fetchProtocolToken(),
          provider: this.provider,
          erc20Token: await this.fetchUnderlyingToken(),
          filter: {
            fromBlock: input.fromBlock,
            toBlock: input.toBlock,
            from: this.addresses.veToken,
            to: input.userAddress,
          },
        }),
        this.getClaimedRewards(input),
      ])
    ).flat()
  }

  async getDeposits(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return getErc20Movements({
      protocolToken: await this.fetchProtocolToken(),
      provider: this.provider,
      erc20Token: await this.fetchUnderlyingToken(),
      filter: {
        fromBlock: input.fromBlock,
        toBlock: input.toBlock,
        to: this.addresses.veToken,
        from: input.userAddress,
      },
    })
  }

  async getClaimedRewards(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return getErc20Movements({
      protocolToken: await this.fetchProtocolToken(),
      provider: this.provider,
      erc20Token: await this.fetchRewardToken(),
      filter: {
        fromBlock: input.fromBlock,
        toBlock: input.toBlock,
        to: input.userAddress,
        from: this.addresses.feeDistributor,
      },
    })
  }

  async getTotalValueLocked({
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const crvContract = Erc20__factory.connect(
      this.addresses.underlyingToken,
      this.provider,
    )
    const protocolToken = await this.fetchProtocolToken()

    const balance = await crvContract.balanceOf(this.addresses.veToken, {
      blockTag: blockNumber,
    })

    return [
      {
        totalSupplyRaw: balance,
        type: TokenType.Protocol,
        ...protocolToken,
      },
    ]
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolToken = await this.fetchProtocolToken()
    const underlyingToken = await this.fetchUnderlyingToken()

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw: BigInt(1) * BigInt(10 ** 18),
        },
      ],
    }
  }
}
