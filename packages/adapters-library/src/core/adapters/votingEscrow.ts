import { Protocol } from '../../adapters/protocols'
import { Erc20__factory } from '../../contracts'
import { Helpers } from '../../core/helpers'
import { IProtocolAdapter, ProtocolToken } from '../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import { CacheToDb } from '../decorators/cacheToDb'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { getErc20Movements } from '../utils/erc20Movements'
import { getTokenMetadata } from '../utils/getTokenMetadata'
import { unixTimestampToDateString } from '../utils/unixTimestampToDateString'

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

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
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
