import type { AdaptersController } from '../../../../core/adaptersController.js'
import type { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import type { Helpers } from '../../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import { filterMapAsync } from '../../../../core/utils/filters.js'
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
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../../types/adapter.js'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import type { Protocol } from '../../../protocols.js'
import { chainIdMap } from '../../sdk/config.js'
import { type ApiClmRewardPool, BeefyProductType } from '../../sdk/types.js'

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

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
