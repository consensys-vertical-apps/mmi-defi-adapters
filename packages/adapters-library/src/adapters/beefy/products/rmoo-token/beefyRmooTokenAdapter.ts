import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
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
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { chainIdMap } from '../../sdk/config'
import { ApiBoost, BeefyProductType } from '../../sdk/types'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class BeefyRmooTokenAdapter implements IProtocolAdapter {
  productId = BeefyProductType.RMOO_TOKEN
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  protected provider: CustomJsonRpcProvider

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
      name: 'Beefy',
      description: 'Beefy defi adapter',
      siteUrl: 'https://beefy.com',
      iconUrl: 'https://beefy.com/icons/icon-96x96.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb()
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const chain = chainIdMap[this.chainId]

    const mooAdapter = this.adaptersController.fetchAdapter(
      this.chainId,
      this.protocolId,
      BeefyProductType.MOO_TOKEN,
    )

    const mooAddressSet = new Set(
      (await mooAdapter.getProtocolTokens()).map((token) =>
        token.address.toLocaleLowerCase(),
      ),
    )

    const mooRewardPools = await fetch(
      `https://api.beefy.finance/boosts/${chain}`,
    )
      .then((res) => res.json())
      .then((res) =>
        (res as ApiBoost[])
          .filter((g) => g.status === 'active')
          .filter((g) => g.chain === chain)
          .filter((g) => g.version === 2)
          .filter((g) => mooAddressSet.has(g.tokenAddress.toLocaleLowerCase())),
      )

    // for each vault, get the latest breakdown to get the token list
    return await filterMapAsync(mooRewardPools, async (mooRewardPool) => {
      const [protocolToken, underlyingToken, rewardToken] = await Promise.all([
        this.helpers.getTokenMetadata(mooRewardPool.earnContractAddress),
        this.helpers.getTokenMetadata(mooRewardPool.tokenAddress),
        this.helpers.getTokenMetadata(mooRewardPool.earnedTokenAddress),
      ])

      return {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
        rewardTokens: [rewardToken],
      }
    })
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const {
      underlyingTokens: [underlyingToken],
      rewardTokens,
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    const mooAdapter = this.adaptersController.fetchAdapter(
      this.chainId,
      this.protocolId,
      BeefyProductType.MOO_TOKEN,
    )

    const mooTokenUwrapRes = await mooAdapter.unwrap({
      protocolTokenAddress: underlyingToken!.address,
      tokenId,
      blockNumber,
    })

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType['Protocol'],
      tokens: mooTokenUwrapRes.tokens,
    }
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
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
