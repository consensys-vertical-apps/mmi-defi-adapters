import { LogDescription } from 'ethers'
import { Protocol } from '../../adapters/protocols'
import {
  CompoundV2Cerc20__factory,
  CompoundV2Comptroller__factory,
} from '../../contracts'
import { BorrowEvent, RepayBorrowEvent } from '../../contracts/CompoundV2Cerc20'
import { Helpers } from '../../core/helpers'
import { IProtocolAdapter, ProtocolToken } from '../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../types/adapter'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import { CacheToDb } from '../decorators/cacheToDb'
import { NotImplementedError } from '../errors/errors'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'
import { filterMapAsync, filterMapSync } from '../utils/filters'
import { getProtocolTokens } from './compoundV2ProtocolTokens'

export abstract class CompoundV2BorrowMarketForkAdapter
  implements IProtocolAdapter
{
  abstract productId: string

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
  }

  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

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

  abstract contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string }>
  >

  abstract getProtocolDetails(): ProtocolDetails

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    return await getProtocolTokens({
      chainId: this.chainId,
      provider: this.provider,
      contractAddresses: this.contractAddresses,
    })
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const comptrollerContract = CompoundV2Comptroller__factory.connect(
      this.contractAddresses[this.chainId]!.comptrollerAddress,
      this.provider,
    )

    const pools = await comptrollerContract.getAssetsIn(userAddress)

    return await filterMapAsync(pools, async (poolContractAddress) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(poolContractAddress)
      ) {
        return undefined
      }

      const {
        underlyingTokens: [underlyingToken],
        ...protocolToken
      } = await this.getProtocolTokenByAddress(poolContractAddress)

      const poolContract = CompoundV2Cerc20__factory.connect(
        poolContractAddress,
        this.provider,
      )

      const borrowBalance = await poolContract.borrowBalanceCurrent.staticCall(
        userAddress,
        {
          blockTag: blockNumber,
        },
      )

      if (borrowBalance === 0n) {
        return undefined
      }

      return {
        ...protocolToken,
        balanceRaw: 1n,
        type: TokenType.Protocol,
        tokens: [
          {
            ...underlyingToken!,
            balanceRaw: borrowBalance,
            type: TokenType.Underlying,
          },
        ],
      }
    })
  }

  unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
