import type { AdaptersController } from '../../../../core/adaptersController.js'
import type { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import type { Helpers } from '../../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import { unixTimestampToDateString } from '../../../../core/utils/unixTimestampToDateString.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  type GetPositionsInput,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  TokenType,
  type Underlying,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../../types/adapter.js'
import type { Protocol } from '../../../protocols.js'

import { getAddress } from 'ethers'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import { Vesting__factory } from '../../contracts/index.js'

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

  readonly adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
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

  private async getRewardBalance({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<bigint> {
    const veTokenContract = Vesting__factory.connect(
      this.addresses.veToken,
      this.provider,
    )
    return veTokenContract.earned(userAddress, { blockTag: blockNumber })
  }

  private async getLockedDetails({
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

  private async getRewardPosition(
    input: GetPositionsInput,
  ): Promise<Underlying> {
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
      protocolTokenAddress: protocolToken.address,
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
}
