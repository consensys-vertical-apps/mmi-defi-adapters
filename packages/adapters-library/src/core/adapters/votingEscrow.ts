import type { Protocol } from '../../adapters/protocols.js'
import { Erc20__factory } from '../../contracts/index.js'
import type { Helpers } from '../../scripts/helpers.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../types/IProtocolAdapter.js'
import {
  type GetEventsInput,
  type GetPositionsInput,
  type GetTotalValueLockedInput,
  type MovementsByBlock,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  type ProtocolTokenTvl,
  TokenType,
  type Underlying,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../types/adapter.js'
import type { Erc20Metadata } from '../../types/erc20Metadata.js'
import type { AdaptersController } from '../adaptersController.js'
import type { Chain } from '../constants/chains.js'
import { CacheToDb } from '../decorators/cacheToDb.js'
import type { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider.js'
import { getErc20Movements } from '../utils/erc20Movements.js'
import { getTokenMetadata } from '../utils/getTokenMetadata.js'
import { unixTimestampToDateString } from '../utils/unixTimestampToDateString.js'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export abstract class VotingEscrow implements IProtocolAdapter {
  abstract productId: string
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

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
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
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

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
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

    return [
      {
        ...protocolTokenMetadata,
        underlyingTokens: [underlyingTokenMetadata],
        rewardTokens: [rewardTokenMetadata],
      },
    ]
  }

  async getRewardPosition(input: GetPositionsInput): Promise<Underlying> {
    const balance = await this.getRewardBalance(input)

    const {
      rewardTokens: [rewardToken],
    } = (await this.getProtocolTokens())[0]!

    return {
      ...rewardToken!,
      balanceRaw: balance,
      type: TokenType.UnderlyingClaimable,
    }
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
    const [{ amount, end }, [protocolToken]] = await Promise.all([
      this.getLockedDetails(input),
      this.getProtocolTokens(),
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
      protocolToken!.name
    } - Unlock time ${unixTimestampToDateString(end)}`

    const tokens = [unwrappedToken]

    if (rewardPosition.balanceRaw > 0n) {
      tokens.push(rewardPosition)
    }

    return [
      {
        type: TokenType.Protocol,
        balanceRaw: amount,
        address: protocolToken!.address,
        symbol: protocolToken!.symbol,
        name: nameWithUnlockTime,
        decimals: protocolToken!.decimals,
        tokens,
      },
    ]
  }

  async getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]> {
    const [protocolToken] = await this.getProtocolTokens()
    return (
      await Promise.all([
        getErc20Movements({
          protocolToken: protocolToken!,
          provider: this.provider,
          erc20Token: protocolToken!.underlyingTokens[0]!,
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
    const [protocolToken] = await this.getProtocolTokens()
    return getErc20Movements({
      protocolToken: protocolToken!,
      provider: this.provider,
      erc20Token: protocolToken!.underlyingTokens[0]!,
      filter: {
        fromBlock: input.fromBlock,
        toBlock: input.toBlock,
        to: this.addresses.veToken,
        from: input.userAddress,
      },
    })
  }

  async getClaimedRewards(input: GetEventsInput): Promise<MovementsByBlock[]> {
    const [protocolToken] = await this.getProtocolTokens()

    return getErc20Movements({
      protocolToken: protocolToken!,
      provider: this.provider,
      erc20Token: protocolToken!.rewardTokens[0]!,
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
    const [protocolToken] = await this.getProtocolTokens()

    const balance = await crvContract.balanceOf(this.addresses.veToken, {
      blockTag: blockNumber,
    })

    return [
      {
        totalSupplyRaw: balance,
        type: TokenType.Protocol,
        address: protocolToken!.address,
        symbol: protocolToken!.symbol,
        name: protocolToken!.name,
        decimals: protocolToken!.decimals,
      },
    ]
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolToken =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return {
      address: protocolToken.address,
      symbol: protocolToken.symbol,
      name: protocolToken.name,
      decimals: protocolToken.decimals,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...protocolToken.underlyingTokens[0]!,
          type: TokenType.Underlying,
          underlyingRateRaw: BigInt(1) * BigInt(10 ** 18),
        },
      ],
    }
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
