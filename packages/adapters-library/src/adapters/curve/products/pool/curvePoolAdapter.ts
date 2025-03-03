import { Erc20__factory } from '../../../../contracts/index.js'
import type { AdaptersController } from '../../../../core/adaptersController.js'
import type { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import type { Helpers } from '../../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata.js'
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
import type { Protocol } from '../../../protocols.js'
import { getCurvePoolData } from '../../common/getPoolData.js'

type AdditionalMetadata = {
  lpTokenManager: string
}

export class CurvePoolAdapter implements IProtocolAdapter {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
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

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const pools = await getCurvePoolData(this.chainId, this.productId)

    return await Promise.all(
      pools.map(async (pool) => {
        return {
          ...(await getTokenMetadata(
            pool.lpTokenAddress,
            this.chainId,
            this.provider,
          )),
          underlyingTokens: await Promise.all(
            pool.coins.map(
              async (coin) =>
                await getTokenMetadata(
                  coin.address,
                  this.chainId,
                  this.provider,
                ),
            ),
          ),
          lpTokenManager: pool.address,
        }
      }),
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { underlyingTokens, lpTokenManager, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

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
    const underlyingTokenConversionRate = underlyingTokens.map(
      (underlyingToken, index) => {
        const balance = balances[index]!

        const underlyingRateRaw =
          balance / (supply / 10n ** BigInt(protocolToken.decimals))

        return {
          type: TokenType.Underlying,
          underlyingRateRaw,
          ...underlyingToken,
        }
      },
    )

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: underlyingTokenConversionRate,
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
