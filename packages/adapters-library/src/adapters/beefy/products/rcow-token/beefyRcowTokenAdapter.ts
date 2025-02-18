import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
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
import { ApiClmRewardPool, BeefyProductType } from '../../sdk/types'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class BeefyRcowTokenAdapter implements IProtocolAdapter {
  productId = BeefyProductType.RCOW_TOKEN
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
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

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const chain = chainIdMap[this.chainId]

    const cowAdapter = this.adaptersController.fetchAdapter(
      this.chainId,
      this.protocolId,
      BeefyProductType.COW_TOKEN,
    )

    const cowAddressSet = new Set(
      (await cowAdapter.getProtocolTokens()).map((token) =>
        token.address.toLocaleLowerCase(),
      ),
    )

    const clmRewardPools = await fetch(
      `https://api.beefy.finance/gov-vaults/${chain}`,
    )
      .then((res) => res.json())
      .then((res) =>
        (res as ApiClmRewardPool[])
          .filter((g) => g.status === 'active')
          .filter((g) => g.chain === chain)
          .filter((g) => g.version === 2)
          .filter((g) => cowAddressSet.has(g.tokenAddress.toLocaleLowerCase())),
      )

    // for each vault, get the latest breakdown to get the token list
    return await filterMapAsync(clmRewardPools, async (clmRewardPool) => {
      const [protocolToken, underlyingToken, ...rewardTokens] =
        await Promise.all([
          this.helpers.getTokenMetadata(clmRewardPool.earnContractAddress),
          this.helpers.getTokenMetadata(clmRewardPool.tokenAddress),
          ...clmRewardPool.earnedTokenAddresses.map((address) =>
            this.helpers.getTokenMetadata(address),
          ),
        ])

      return {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
        rewardTokens,
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

    const cowAdapter = this.adaptersController.fetchAdapter(
      this.chainId,
      this.protocolId,
      BeefyProductType.COW_TOKEN,
    )

    const cowTokenUwrapRes = await cowAdapter.unwrap({
      protocolTokenAddress: underlyingToken!.address,
      tokenId,
      blockNumber,
    })

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType['Protocol'],
      tokens: cowTokenUwrapRes.tokens,
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
