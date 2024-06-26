import { Protocol } from '../../adapters/protocols'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { AdaptersController } from '../adaptersController'
import { Chain } from '../constants/chains'
import { IMetadataBuilder } from '../decorators/cacheToFile'
import { NotImplementedError } from '../errors/errors'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'

export type DeFiAssetsMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata[]
  }
>

export abstract class WriteOnlyDeFiAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  abstract productId: string
  protocolId: Protocol
  chainId: Chain

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  abstract buildMetadata(): Promise<DeFiAssetsMetadata>

  abstract getProtocolDetails(): ProtocolDetails

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }

  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
