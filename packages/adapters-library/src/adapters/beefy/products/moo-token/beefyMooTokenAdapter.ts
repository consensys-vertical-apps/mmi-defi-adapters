import { getAddress } from 'ethers'
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
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'

type Metadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

const chainIdMap: Record<Chain, string> = {
  [Chain.Ethereum]: 'ethereum',
  [Chain.Optimism]: 'optimism',
  [Chain.Bsc]: 'bsc',
  [Chain.Polygon]: 'polygon',
  [Chain.Fantom]: 'fantom',
  [Chain.Base]: 'base',
  [Chain.Arbitrum]: 'arbitrum',
  [Chain.Avalanche]: 'avax',
  [Chain.Linea]: 'linea',
}

export class BeefyMooTokenAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'moo-token'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

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

  /**
   * Add your protocol details
   */
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
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<Metadata> {
    type ApiVault = {
      id: string;
      status: "active" | "eol";
      earnedTokenAddress: string;
      chain: string;
      platformId: string;
      token: string;
      tokenAddress: string;
      earnedToken: string;
      isGovVault?: boolean;
      bridged?: object;
      assets?: string[];
    };
    type ApiToken = {
      type: string,
      id: string,
      symbol: string,
      name: string,
      chainId: string,
      oracle: string,
      oracleId: string,
      address: string,
      decimals: number
    }
    type ApiTokenList = {
      [chainId: string]: {
        [tokenId: string]: ApiToken;
      };
    }
    type ApiBoost = {
      id: string,
      poolId: string,
    }
    const vaults = await (await fetch('https://api.beefy.finance/vaults')).json() as ApiVault[]
    const tokens = await (await fetch("https://api.beefy.finance/tokens")).json() as ApiTokenList
    const boosts = await (await fetch("https://api.beefy.finance/boosts")).json() as ApiBoost[]

    const boostedVaultsMap = boosts.reduce((acc, boost) => {
      acc[boost.poolId] = true
      return acc
    }, {} as Record<string, boolean>)
    const chain = chainIdMap[this.chainId]

    return vaults
      .filter(vault => vault.chain === chain)
      // remove inactive vaults, might not be a good idea to remove them completely
      .filter(vault => vault.status === 'active')
      // remove unsupported gov vaults
      .filter(vault => vault.isGovVault !== true)
      // remove unsupported bridged vaults
      .filter(vault => Object.keys(vault.bridged||{}).length === 0)
      // remove unsupported vaults with a boost, accounting of user balance is a bit more complex
      .filter(vault => !boostedVaultsMap[vault.id])
      .reduce((acc, vault) => {
        const protocolToken = {
          address: getAddress(vault.earnedTokenAddress),
          symbol: vault.earnedToken,
          name: vault.token,
          decimals: 18,
          logo: 'https://beefy.com/icons/icon-96x96.png',
        }

        const underlyingTokens = (vault.assets?.map((tokenId) => {
          let token = (tokens[vault.chain] ?? {})[tokenId] || null;
      

          // remove the "W" from the token id
          if (token && token.address === "native") {
            token = (tokens[vault.chain] ?? {})[tokenId.slice(1)] || null;
          }   
          if (!token) {
            return null
          }

          return ({
            address: getAddress(token.address),
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
          })
        }) || [])
        .filter((token): token is Erc20Metadata => !!token);

      acc[vault.id] = {
        protocolToken,
        underlyingTokens,
      }

      return acc
    } , {} as Metadata)
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
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
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

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    // boosts not supported yet
    return []
  }

  async getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    // boosts not supported yet
    return []
  }

  async getExtraRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    // boosts not supported yet
    return []
  }

  async getExtraRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    // boosts not supported yet
    return []
  }
}
