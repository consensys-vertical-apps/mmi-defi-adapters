import { getAddress } from 'ethers'
import { Erc20__factory } from '../../../../contracts/factories/Erc20__factory'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { Replacements } from '../../../../scripts/replacements'
import { RewardsAdapter } from '../../../../scripts/rewardAdapter'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
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
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { queryCurvePools } from '../../../curve/common/getPoolData'
import { Protocol } from '../../../protocols'

export class CurvePoolAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
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
      name: 'Curve',
      description: 'Curve pool adapter',
      siteUrl: 'https://curve.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/crv.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return queryCurvePools(this.chainId, this.provider)
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
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
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolTokenMetadata =
      await this.fetchPoolMetadata(protocolTokenAddress)

    const underlyingTokenConversionRate = await this.unwrapProtocolToken(
      protocolTokenMetadata.protocolToken,
      blockNumber,
    )

    return {
      ...protocolTokenMetadata.protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: underlyingTokenConversionRate,
    }
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const { underlyingTokens, protocolToken, lpTokenManager } =
      (await this.fetchPoolMetadata(protocolTokenMetadata.address)) as {
        protocolToken: Erc20Metadata
        underlyingTokens: Erc20Metadata[]
        lpTokenManager: string
      }

    const balances = await Promise.all(
      underlyingTokens.map(async (token) => {
        if (token.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
          return this.provider.getBalance(lpTokenManager, blockNumber)
        }

        const underlyingTokenContract = Erc20__factory.connect(
          token.address,
          this.provider,
        )

        return underlyingTokenContract.balanceOf(lpTokenManager, {
          blockTag: blockNumber,
        })
      }),
    )

    const lpTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const supply = await lpTokenContract.totalSupply({ blockTag: blockNumber })

    // note balances array not same size as underlying array, might be a vyper: no dynamic array limitation
    return underlyingTokens.map((underlyingToken, index) => {
      const balance = balances[index]!

      const underlyingRateRaw =
        balance / (supply / 10n ** BigInt(protocolToken.decimals))

      return {
        type: TokenType.Underlying,
        underlyingRateRaw,
        ...underlyingToken,
      }
    })
  }

  private async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }
  private async getUnderlyingTokens(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).underlyingTokens
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
