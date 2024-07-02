import { Protocol } from '../../adapters/protocols'
import { Erc20__factory } from '../../contracts'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import { CacheToFile, IMetadataBuilder } from '../decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { getErc20Movements } from '../utils/erc20Movements'
import { getTokenMetadata } from '../utils/getTokenMetadata'
import { unixTimestampToDateString } from '../utils/unixTimestampToDateString'

type Metadata = {
  address: string
} & (
  | { tag_id: TagIds.token; value: Erc20Metadata }
  | { tag_id: TagIds.isProtocolToken; value: boolean }
  | { tag_id: TagIds.isRewardManager; value: boolean }
  | { tag_id: TagIds.underlyingTokenLink; value: string }
)

enum TagIds {
  token = 'token',
  underlyingTokenLink = 'underlying_token_link',
  isProtocolToken = 'is_protocol_token',
  isRewardManager = 'is_reward_manager',
}

export abstract class VotingEscrow
  implements IProtocolAdapter, IMetadataBuilder
{
  abstract productId: string
  protocolId: Protocol
  chainId: Chain

  provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

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

  abstract getProtocolDetails(): ProtocolDetails

  abstract addresses: {
    veToken: string
    underlyingToken: string
    rewardToken: string
    feeDistributor: string
  }

  abstract getRewardBalance(input: GetPositionsInput): Promise<bigint>

  abstract getLockedDetails(
    input: GetPositionsInput,
  ): Promise<{ amount: bigint; end: bigint }>

  /**
   * Creates a token and isProtocol tag
   */
  createProtocolTokenMetadata(protocolToken: Erc20Metadata): Metadata[] {
    return [
      {
        address: this.addresses.veToken,
        tag_id: TagIds.isProtocolToken,
        value: true,
      },

      {
        address: protocolToken.address,
        tag_id: TagIds.token,
        value: protocolToken,
      },
    ]
  }

  /**
   * Finds tokens which have isProtocolToken tag
   */
  async getProtocolTokenMetadata(): Promise<Erc20Metadata[]> {
    const metadata = (await this.buildMetadata()) as Metadata[]

    const protocolMetadata = metadata.filter(
      (metadata) => metadata.tag_id === TagIds.isProtocolToken,
    )

    return protocolMetadata.reduce((acc: Erc20Metadata[], protocolToken) => {
      const relatedTokenTag = metadata.find(
        (metadata) =>
          metadata.address === protocolToken.address &&
          metadata.tag_id === TagIds.token,
      )
      if (relatedTokenTag) {
        acc.push(relatedTokenTag.value as Erc20Metadata)
      }
      return acc
    }, [])
  }

  /**
   * Creates a token and underlying_token_link from the protocol token address to the underlying token address
   */
  createUnderlyingTokenMetadata(
    parentTokenAddress: string,
    underlyingToken: Erc20Metadata,
  ): Metadata[] {
    return [
      {
        address: parentTokenAddress,
        tag_id: TagIds.underlyingTokenLink,
        value: underlyingToken.address,
      },

      {
        address: underlyingToken.address,
        tag_id: TagIds.token,
        value: underlyingToken,
      },
    ]
  }

  /**
   * Finds tokens which are linked to the parent token address
   */
  async getUnderlyingTokenMetadata(
    parentTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const metadatas = (await this.buildMetadata()) as Metadata[]
    const link = metadatas.find(
      (metadata) =>
        metadata.tag_id === TagIds.underlyingTokenLink &&
        metadata.address === parentTokenAddress,
    )
    const underlyingToken = metadatas.find(
      (metadata) =>
        metadata.address === link?.value && metadata.tag_id === TagIds.token,
    )

    return underlyingToken?.value as Erc20Metadata
  }

  /**
   * Creates a reward manager tag
   */
  createRewardManagerMetadata(address: string): Metadata {
    return {
      address: address,
      tag_id: TagIds.isRewardManager,
      value: true,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const [
      protocolTokenMetadata,
      underlyingTokenMetadata,
      rewardTokenMetadata,
    ] = await Promise.all([
      getTokenMetadata(this.addresses.veToken, this.chainId, this.provider),
      getTokenMetadata(
        this.addresses.underlyingToken,
        this.chainId,
        this.provider,
      ),
      getTokenMetadata(this.addresses.rewardToken, this.chainId, this.provider),
    ])

    const metadata = [
      ...this.createProtocolTokenMetadata(protocolTokenMetadata),

      ...this.createUnderlyingTokenMetadata(
        protocolTokenMetadata.address,
        underlyingTokenMetadata,
      ),
      ...this.createUnderlyingTokenMetadata(
        this.addresses.feeDistributor,
        rewardTokenMetadata,
      ),
      this.createRewardManagerMetadata(this.addresses.feeDistributor),
    ]

    return metadata
  }

  async getRewardPosition(input: GetPositionsInput): Promise<Underlying> {
    const balance = await this.getRewardBalance(input)

    return {
      ...(await this.getUnderlyingTokenMetadata(this.addresses.feeDistributor)),
      balanceRaw: balance,
      type: TokenType.UnderlyingClaimable,
    }
  }

  async getProtocolToken(): Promise<Erc20Metadata> {
    return (await this.getProtocolTokens())[0]!
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

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const lockedDetailsPromise = await this.getLockedDetails(input)

    const protocolTokenPromise = this.getProtocolToken()

    const [{ amount, end }, protocolToken] = await Promise.all([
      lockedDetailsPromise,
      protocolTokenPromise,
    ])

    if (amount === 0n) {
      return []
    }

    const rewardPosition = await this.getRewardPosition(input)

    const unwrappedToken = await this.unwrappedBalance({
      protocolTokenBalance: amount,
      protocolTokenAddress: this.addresses.veToken,
      blockNumber: input.blockNumber,
    })

    const nameWithUnlockTime = `${
      protocolToken.name
    } - Unlock time ${unixTimestampToDateString(end)}`

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
    const protocolToken = await this.getProtocolToken()
    return (
      await Promise.all([
        getErc20Movements({
          protocolToken: protocolToken,
          provider: this.provider,
          erc20Token: await this.getUnderlyingTokenMetadata(
            protocolToken.address,
          ),
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
    const protocolToken = await this.getProtocolToken()
    return getErc20Movements({
      protocolToken: await this.getProtocolToken(),
      provider: this.provider,
      erc20Token: await this.getUnderlyingTokenMetadata(protocolToken.address),
      filter: {
        fromBlock: input.fromBlock,
        toBlock: input.toBlock,
        to: this.addresses.veToken,
        from: input.userAddress,
      },
    })
  }

  async getClaimedRewards(input: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolToken = await this.getProtocolToken()

    return getErc20Movements({
      protocolToken: protocolToken,
      provider: this.provider,
      erc20Token: await this.getUnderlyingTokenMetadata(
        this.addresses.feeDistributor,
      ),
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
    const protocolToken = await this.getProtocolToken()

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
    const protocolToken = await this.getProtocolToken()
    const underlyingToken = await this.getUnderlyingTokenMetadata(
      protocolToken.address,
    )

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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return this.getProtocolTokenMetadata()
  }
}
