import { getAddress } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { AdaptersController } from '../../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import {
  StargateFactory__factory,
  StargateToken__factory,
} from '../../contracts'

type AdditionalMetadata = { poolId: number; underlyingTokens: Erc20Metadata[] }

export class StargatePoolAdapter implements IProtocolAdapter {
  productId = 'pool'
  helpers: Helpers
  chainId: Chain
  protocolId: Protocol
  provider: CustomJsonRpcProvider
  adaptersController: AdaptersController

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
    version: 2,
  }

  constructor({
    chainId,
    protocolId,
    helpers,
    provider,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.chainId = chainId
    this.protocolId = protocolId
    this.provider = provider
    this.helpers = helpers
    this.adaptersController = adaptersController
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Stargate',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvlUsingUnderlyingTokenBalances({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolToken =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return this.helpers.withdrawals({
      protocolToken,
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

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolToken =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const underlyingTokens = (
      await this.getProtocolTokenByAddress(protocolTokenAddress)
    ).underlyingTokens

    const oneToken = BigInt(1 * 10 ** protocolToken.decimals)

    return this.helpers.unwrapTokenWithRates({
      protocolToken,
      underlyingTokens,
      underlyingRates: [
        await StargateToken__factory.connect(
          protocolTokenAddress,
          this.provider,
        ).amountLPtoLD(oneToken, {
          blockTag: blockNumber,
        }),
      ],
    })
  }

  @CacheToFile({ fileKey: 'lp-token' })
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]: getAddress(
        '0x06D538690AF257Da524f25D0CD52fD85b1c2173E',
      ),
      [Chain.Arbitrum]: getAddress(
        '0x55bDb4164D28FBaF0898e0eF14a589ac09Ac9970',
      ),
    }

    const lpFactoryContract = StargateFactory__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )

    const poolsLength = Number(await lpFactoryContract.allPoolsLength())

    const metadataObject: ProtocolToken<AdditionalMetadata>[] = []

    const promises = Array.from({ length: poolsLength }, async (_, i) => {
      const poolAddress = await lpFactoryContract.allPools(i)

      const poolContract = StargateToken__factory.connect(
        poolAddress,
        this.provider,
      )

      const poolIdPromise = poolContract.poolId()
      const underlyingTokenAddressPromise = poolContract.token()

      const [poolId, underlyingTokenAddress] = await Promise.all([
        poolIdPromise,
        underlyingTokenAddressPromise,
      ])

      const protocolTokenPromise = getTokenMetadata(
        poolAddress,
        this.chainId,
        this.provider,
      )
      const underlyingTokenPromise = getTokenMetadata(
        underlyingTokenAddress,
        this.chainId,
        this.provider,
      )

      const [protocolToken, underlyingToken] = await Promise.all([
        protocolTokenPromise,
        underlyingTokenPromise,
      ])

      metadataObject.push({
        poolId: Number(poolId),
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      })
    })

    await Promise.all(promises)

    return metadataObject
  }
}
