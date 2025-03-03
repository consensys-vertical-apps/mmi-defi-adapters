import type { Protocol } from '../adapters/protocols.js'
import type { AdaptersController } from '../core/adaptersController.js'
import type { Chain } from '../core/constants/chains.js'
import type { IHelpers } from '../core/helpers.js'
import type {
  AdapterSettings,
  GetPositionsInput,
  GetRewardPositionsInput,
  ProtocolDetails,
  ProtocolPosition,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from './adapter.js'
import type { Erc20Metadata } from './erc20Metadata.js'
import type { Json } from './json.js'

export type JsonMetadata = Record<string, Json>

export type Erc20ExtendedMetadata = Erc20Metadata & JsonMetadata

export type AdditionalMetadataWithReservedFields = {
  underlyingTokens?: Erc20ExtendedMetadata[]
  rewardTokens?: Erc20ExtendedMetadata[]
  extraRewardTokens?: Erc20ExtendedMetadata[]
  tokenId?: string
} & JsonMetadata

export type ProtocolToken<
  AdditionalMetadata extends
    AdditionalMetadataWithReservedFields = JsonMetadata,
> = Erc20Metadata & {
  underlyingTokens: Erc20ExtendedMetadata[]
} & AdditionalMetadata

export interface IProtocolAdapter {
  adapterSettings: AdapterSettings

  helpers: IHelpers

  /**
   * Unique identifier of the protocol.
   */
  protocolId: Protocol

  /**
   * Unique identifier of the blockchain network.
   */
  chainId: Chain

  /**
   * Unique identifier for this protocol adapter
   */
  productId: string

  adaptersController: AdaptersController

  /**
   * @remarks Returns high level metadata for the protocol
   *
   * @returns {ProtocolDetails} Object containing details about the protocol such as name and description.
   */
  getProtocolDetails(): ProtocolDetails

  /**
   * @remarks Returns array of pool tokens (lp tokens) for the protocol
   *
   * @returns {Promise<ProtocolToken[]>} An array of objects detailing the protocol tokens.
   */
  getProtocolTokens(writeToFile?: boolean): Promise<ProtocolToken[]>

  /**
   *
   * @remarks Returns array of user positions opened in this protocol
   *
   * @param {GetPositionsInput} input - Object with user-address and optional blockNumber override.
   * @returns {Promise<ProtocolPosition[]>} An array of objects detailing the user positions.
   */
  getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]>

  /**
   *
   * @remarks Returns "price" of lp-tokens in the form of the underlying tokens. Unwraps tokens to the current unwrapping exchange rate
   * @remarks Read only method, doesn't update blockchain state.
   *
   * @param {UnwrapInput} input - Object with protocol-token-address and optional blockNumber override.
   * @returns {Promise<UnwrapExchangeRate>} Object detailing the price per share of the protocol token.
   */
  unwrap(input: UnwrapInput): Promise<UnwrapExchangeRate>

  getRewardPositions?(
    input: GetRewardPositionsInput,
  ): Promise<UnderlyingReward[]>

  getExtraRewardPositions?(
    input: GetRewardPositionsInput,
  ): Promise<UnderlyingReward[]>
}
