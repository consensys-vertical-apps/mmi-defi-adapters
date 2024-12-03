import { Erc20Metadata } from '@metamask-institutional/defi-sdk'
import { VotingEscrow } from '../../../../core/adapters/votingEscrow'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { unixTimestampToDateString } from '../../../../core/utils/unixTimestampToDateString'
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
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'

import { getAddress } from 'ethers'
import { Vesting__factory } from '../../contracts'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class ZerolendVestingAdapter implements IProtocolAdapter {
  readonly productId = 'vesting'

  readonly protocolId: Protocol
  readonly chainId: Chain
  readonly helpers: Helpers
  readonly provider: CustomJsonRpcProvider
  readonly adaptersController: AdaptersController

  readonly adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  private readonly addresses = {
    veToken: getAddress('0xf374229a18ff691406f99ccbd93e8a3f16b68888'),
    underlyingToken: getAddress('0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7'),
    rewardToken: getAddress('0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7'),
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Zerolend',
      description: 'Zerolend defi adapter',
      siteUrl: '',
      iconUrl: '',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const [
      protocolTokenMetadata,
      underlyingTokenMetadata,
      rewardTokenMetadata,
    ] = await Promise.all([
      this.helpers.getTokenMetadata(this.addresses.veToken),
      this.helpers.getTokenMetadata(this.addresses.underlyingToken),
      this.helpers.getTokenMetadata(this.addresses.rewardToken),
    ])

    return [
      {
        ...protocolTokenMetadata,
        underlyingTokens: [underlyingTokenMetadata],
        rewardTokens: [rewardTokenMetadata],
      },
    ]
  }

  async getRewardBalance({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<bigint> {
    const veTokenContract = Vesting__factory.connect(
      this.addresses.veToken,
      this.provider,
    )
    return veTokenContract.earned(userAddress, { blockTag: blockNumber })
  }

  async getLockedDetails({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<{ amount: bigint; end: bigint }[]> {
    const veTokenContract = Vesting__factory.connect(
      this.addresses.veToken,
      this.provider,
    )
    const nftDetails = await veTokenContract.getLockedNftDetails(userAddress, {
      blockTag: blockNumber,
    })

    if (nftDetails[0].length === 0) return []

    return nftDetails[1].map((nft) => ({
      amount: nft.amount,
      end: nft.end,
    }))
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

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const [lockedDetails, [protocolToken]] = await Promise.all([
      this.getLockedDetails(input),
      this.getProtocolTokens(),
    ])

    if (lockedDetails.length === 0 || !protocolToken) {
      return []
    }

    const rewardPosition = await this.getRewardPosition(input)

    const positions = await Promise.all(
      lockedDetails.map(({ amount, end }) =>
        this.buildPositions({ amount, end }, protocolToken, input),
      ),
    )

    if (rewardPosition.balanceRaw > 0n) {
      positions[0]?.tokens.push(rewardPosition)
    }

    return positions
  }

  private async buildPositions(
    { amount, end }: { amount: bigint; end: bigint },
    protocolToken: ProtocolToken<AdditionalMetadata>,
    input: GetPositionsInput,
  ) {
    const unwrappedToken = await this.unwrappedBalance({
      protocolTokenBalance: amount,
      protocolTokenAddress: this.addresses.veToken,
      blockNumber: input.blockNumber,
    })

    const nameWithUnlockTime = `${
      protocolToken!.name
    } - Unlock time ${unixTimestampToDateString(end)}`

    const tokens = [unwrappedToken]

    return {
      type: TokenType.Protocol,
      balanceRaw: amount,
      address: protocolToken.address,
      symbol: protocolToken.symbol,
      name: nameWithUnlockTime,
      decimals: protocolToken.decimals,
      tokens,
    }
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

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
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
}
