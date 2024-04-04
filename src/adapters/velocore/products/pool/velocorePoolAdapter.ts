import { getAddress, solidityPacked } from 'ethers'
import _ from 'lodash'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import {
  MaxMovementLimitExceededError,
  NotImplementedError,
} from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolDetails,
  PositionType,
  GetTotalValueLockedInput,
  ProtocolTokenTvl,
  AssetType,
  ProtocolAdapterParams,
  GetPositionsInput,
  ProtocolPosition,
  TokenType,
  GetEventsInput,
  MovementsByBlock,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Json } from '../../../../types/json'
import { Protocol } from '../../../protocols'
import {
  ERC1155__factory,
  Lens,
  Lens__factory,
  Vault__factory,
} from '../../contracts'
import { GaugeDataStructOutput } from '../../contracts/Lens'
import { GaugeEvent } from '../../contracts/Vault'

const ETH_ADDRESS = getAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
const ETH_TOKEN_HASH =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

enum TokenSpec {
  ERC20 = 0,
  ERC721 = 1,
  ERC1155 = 2,
}
interface VelocoreAdapterContracts {
  vault: string
  lens: string
}

interface VelocoreTokenMetadata extends Erc20Metadata {
  tokenHash: string
  tokenId?: string
}

const contractAddresses: Partial<Record<Chain, VelocoreAdapterContracts>> = {
  [Chain.Linea]: {
    vault: getAddress('0x1d0188c4B276A09366D05d6Be06aF61a73bC7535'),
    lens: getAddress('0xaA18cDb16a4DD88a59f4c2f45b5c91d009549e06'),
  },
}

type VelocorePoolAdapterMetadata = Record<
  string,
  {
    protocolToken: VelocoreTokenMetadata
    underlyingTokens: VelocoreTokenMetadata[]
  }
> &
  Json

export class VelocorePoolAdapter implements IMetadataBuilder, IProtocolAdapter {
  productId = 'pool'
  chainId: Chain
  protocolId: Protocol
  protected provider: CustomJsonRpcProvider
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Velocore',
      description: 'Velocore pool adapter',
      siteUrl: 'https://linea.velocore.xyz',
      iconUrl: 'https://static.velocore.xyz/images/59144/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const gauges = await this.getAllGauges()

    const metadata = {} as VelocorePoolAdapterMetadata

    await Promise.all(
      gauges.map(async (gaugeData) => {
        const { gauge, stakeableTokens, underlyingTokens } = gaugeData
        const [lpTokenMetadataList, underlyingTokenMetadataList] =
          await Promise.all([
            Promise.all(
              stakeableTokens.map((lpTokenHash) => {
                return this.getVelocoreTokenMetadata(lpTokenHash)
              }),
            ),
            Promise.all(
              underlyingTokens.map((tokenHash) => {
                return this.getVelocoreTokenMetadata(tokenHash)
              }),
            ),
          ])
        lpTokenMetadataList.forEach((lpTokenMetadata) => {
          metadata[getAddress(gauge)] = {
            protocolToken: lpTokenMetadata,
            underlyingTokens: underlyingTokenMetadataList,
          }
        })
      }),
    )

    return metadata
  }

  async getProtocolTokens(): Promise<(Erc20Metadata & { tokenId?: string })[]> {
    return Object.values(await this.buildMetadata()).flatMap((metadata) => {
      return metadata ? [metadata.protocolToken] : []
    })
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
    tokenIds,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const gauges = await this.getAllGauges({ userAddress, blockNumber })

    const protocolPositions = [] as ProtocolPosition[]
    await Promise.all(
      gauges.map(async (gaugeData) => {
        const {
          stakeableTokens,
          userStakedAmounts,
          underlyingTokens,
          userUnderlying,
        } = gaugeData
        const { address: lpTokenAddress, tokenId: lpTokenId } =
          this.decodeTokenHash(stakeableTokens[0]!)
        if (
          (protocolTokenAddresses &&
            !protocolTokenAddresses.some(
              (addr, idx) =>
                addr.toLowerCase() === lpTokenAddress.toLowerCase() &&
                (!tokenIds || tokenIds[idx] === lpTokenId.toString()),
            )) ||
          (userStakedAmounts[0] || 0n) <= 0n
        ) {
          return
        }

        const [lpTokenMetadataList, underlyingTokenMetadataList] =
          await Promise.all([
            Promise.all(
              stakeableTokens.map((lpTokenHash) => {
                return this.getVelocoreTokenMetadata(lpTokenHash)
              }),
            ),
            Promise.all(
              underlyingTokens.map((tokenHash) => {
                return this.getVelocoreTokenMetadata(tokenHash)
              }),
            ),
          ])
        lpTokenMetadataList.forEach((lpTokenMetadata, i) => {
          protocolPositions.push({
            ...lpTokenMetadata,
            type: TokenType.Protocol,
            balanceRaw: userStakedAmounts[i]!,
            tokens: underlyingTokenMetadataList.map(
              (underlyingTokenMetadata, j) => {
                return {
                  ...underlyingTokenMetadata,
                  type: TokenType.Underlying,
                  balanceRaw: userUnderlying[j]!,
                }
              },
            ),
          })
        })
      }),
    )
    return protocolPositions
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    tokenId,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolTokenMetadata = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
      tokenId,
    )
    return this.getProtocolTokenMovements({
      protocolToken:
        protocolTokenMetadata.protocolToken as VelocoreTokenMetadata,
      filter: {
        fromBlock,
        toBlock,
        type: 'WITHDRAWAL',
        user: userAddress,
      },
    })
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    tokenId,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolTokenMetadata = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
      tokenId,
    )
    return this.getProtocolTokenMovements({
      protocolToken:
        protocolTokenMetadata.protocolToken as VelocoreTokenMetadata,
      filter: {
        fromBlock,
        toBlock,
        type: 'DEPOSIT',
        user: userAddress,
      },
    })
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const gauges = await this.getAllGauges({ blockNumber: _input.blockNumber })
    const protocolTokenTvls = (
      await Promise.all(
        gauges.map(async (gaugeData) => {
          const {
            poolData: { lpTokens, mintedLPTokens, listedTokens, reserves },
            stakeableTokens,
            underlyingTokens,
          } = gaugeData

          const [protocolTokenMetadataList, underlyingTokenTvls] =
            await Promise.all([
              Promise.all(
                stakeableTokens.map((tokenHash) =>
                  this.getVelocoreTokenMetadata(tokenHash),
                ),
              ),
              Promise.all(
                underlyingTokens.map(async (tokenHash) => {
                  const metadata = await this.getVelocoreTokenMetadata(
                    tokenHash,
                  )
                  const amountIdx = listedTokens.findIndex(
                    (t) => t.toLowerCase() === tokenHash.toLowerCase(),
                  )
                  return {
                    ...metadata,
                    type: TokenType.Underlying,
                    totalSupplyRaw: reserves[amountIdx]!,
                  }
                }),
              ),
            ])
          return protocolTokenMetadataList.map((protocolTokenMetadata) => {
            const amountIdx = lpTokens.findIndex(
              (tokenHash) =>
                tokenHash.toLowerCase() ===
                protocolTokenMetadata.tokenHash.toLowerCase(),
            )
            return {
              ...protocolTokenMetadata,
              totalSupplyRaw: mintedLPTokens[amountIdx]!,
              type: TokenType.Protocol,
              tokens: underlyingTokenTvls,
            }
          })
        }),
      )
    ).flat()
    return protocolTokenTvls
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
    tokenId,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolTokenMetadata = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
      tokenId,
    )

    const lpAmountDecimals = 3n
    const queryResult = await this.queryRemoveLp({
      protocolTokenMetadata,
      blockNumber,
      amount:
        10n **
        (BigInt(protocolTokenMetadata.protocolToken.decimals) -
          lpAmountDecimals),
    })

    return {
      ...protocolTokenMetadata.protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: protocolTokenMetadata.underlyingTokens.map(
        (underlyingTokenMetadata, idx) => {
          return {
            ...underlyingTokenMetadata,
            type: TokenType.Underlying,
            underlyingRateRaw:
              (queryResult[idx] ?? 0n) * 10n ** lpAmountDecimals,
          }
        },
      ),
    }
  }

  async getProtocolTokenMovements({
    protocolToken,
    filter: { fromBlock, toBlock, user, type },
  }: {
    protocolToken: VelocoreTokenMetadata
    filter: {
      fromBlock: number
      toBlock: number
      user: string
      type: 'WITHDRAWAL' | 'DEPOSIT'
    }
  }): Promise<MovementsByBlock[]> {
    const gauges = await this.getAllGauges()
    const gauge = gauges.find(
      (gaugeData) =>
        gaugeData.stakeableTokens[0]!.toLowerCase() ===
        protocolToken.tokenHash.toLowerCase(),
    )
    if (!gauge) {
      throw new Error('Protocol token not found')
    }

    const vaultContract = Vault__factory.connect(
      contractAddresses[this.chainId]!.vault,
      this.provider,
    )
    const filter = vaultContract.filters.Gauge(gauge.gauge, user)
    const eventResults = await vaultContract.queryFilter<GaugeEvent.Event>(
      filter,
      fromBlock,
      toBlock,
    )
    const filteredEventResults = eventResults.filter((event) => {
      const delta = event.args.delta[1] ?? 0n
      return (
        (type === 'DEPOSIT' ? delta > 0n : delta < 0n) &&
        event.args.tokenRef.some(
          (tokenHash) =>
            tokenHash.toLowerCase() === protocolToken.tokenHash.toLowerCase(),
        )
      )
    })
    // Temp fix to avoid timeouts
    // Remember these are on per pool basis.
    // We should monitor number
    // 20 interactions with same pool feels a healthy limit
    if (filteredEventResults.length > 20) {
      throw new MaxMovementLimitExceededError()
    }

    return await Promise.all(
      filteredEventResults.map(async (gaugeEvent) => {
        const {
          blockNumber,
          args: { delta },
          transactionHash,
        } = gaugeEvent
        const protocolTokenMovementValueRaw = ((val) =>
          val >= 0n ? val : -val)(delta[1] ?? 0n)

        return {
          transactionHash,
          protocolToken: {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
            tokenId: protocolToken.tokenId,
          },
          tokens: [
            {
              ...protocolToken,
              balanceRaw: protocolTokenMovementValueRaw,
              type: TokenType.Underlying,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )
  }

  private formatGaugeData(rawData: GaugeDataStructOutput) {
    const [
      gauge,
      poolData,
      killed,
      totalVotes,
      userVotes,
      userClaimable,
      emissionRate,
      userEmissionRate,
      stakedValueInHubToken,
      userStakedValueInHubToken,
      averageInterestRatePerSecond,
      userInterestRatePerSecond,
      stakeableTokens,
      stakedAmounts,
      userStakedAmounts,
      underlyingTokens,
      stakedUnderlying,
      userUnderlying,
      bribes,
    ] = rawData
    return {
      gauge,
      poolData,
      killed,
      totalVotes,
      userVotes,
      userClaimable,
      emissionRate,
      userEmissionRate,
      stakedValueInHubToken,
      userStakedValueInHubToken,
      averageInterestRatePerSecond,
      userInterestRatePerSecond,
      stakeableTokens,
      stakedAmounts,
      userStakedAmounts,
      underlyingTokens,
      stakedUnderlying,
      userUnderlying,
      bribes,
    }
  }

  private async getVelocoreTokenMetadata(
    tokenHash: string,
  ): Promise<VelocoreTokenMetadata> {
    const { tokenSpec, address, isEth } = this.decodeTokenHash(tokenHash)
    if (tokenSpec === TokenSpec.ERC20) {
      if (isEth) {
        return {
          tokenHash: ETH_TOKEN_HASH,
          address: ETH_ADDRESS,
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        }
      } else {
        return {
          ...(await getTokenMetadata(address, this.chainId, this.provider)),
          tokenHash,
        }
      }
    } else if (tokenSpec === TokenSpec.ERC1155) {
      return this.getVelocore1155TokenMetadata(tokenHash)
    }
    throw new NotImplementedError()
  }

  private async getVelocore1155TokenMetadata(tokenHash: string) {
    const { address, tokenId } = this.decodeTokenHash(tokenHash)
    const tokenContract = ERC1155__factory.connect(address, this.provider)
    const uri = await tokenContract.uri(tokenId)
    const res = await fetch(this.formatMetadataURI(uri, tokenId))
    const result = await res.json()
    return {
      ...result,
      symbol: result.symbol ?? result.name,
      address: getAddress(address),
      tokenHash,
      tokenId: tokenId.toString(),
    } as VelocoreTokenMetadata
  }

  private formatMetadataURI(uri: string, tokenId: number) {
    return uri
      .replace(/api.velocore.xyz/g, 'static.velocore.xyz')
      .replace(/{id}/g, tokenId.toString())
  }

  private decodeTokenHash(tokenHash: string) {
    const tokenSpec = parseInt('0x' + tokenHash.slice(2, 4))
    const tokenId = parseInt('0x' + tokenHash.slice(4, 26))
    const address = '0x' + tokenHash.slice(26, 66)

    return tokenHash === ETH_TOKEN_HASH
      ? {
          tokenSpec: TokenSpec.ERC20,
          tokenId: 0,
          address,
          isEth: true,
          tokenHash,
        }
      : { tokenSpec, tokenId, address, isEth: false, tokenHash }
  }

  private async getCanonicalPools({
    lensContract,
    userAddress = ZERO_ADDRESS,
    blockNumber,
  }: {
    lensContract: Lens
    userAddress?: string
    blockNumber?: number
  }) {
    const poolLength = Number(
      await lensContract.canonicalPoolLength.staticCall(),
    )
    const MAX_POOL_PER_PAGE = poolLength
    const RETRY = Math.floor(Math.log2(MAX_POOL_PER_PAGE)) + 1
    for (let i = 0; i < RETRY; i++) {
      const poolPerPage = Math.floor(MAX_POOL_PER_PAGE / 2 ** i)
      return (
        await Promise.all(
          _.range(0, Math.ceil(poolLength / poolPerPage)).map((idx) =>
            lensContract.canonicalPools.staticCall(
              userAddress,
              idx * poolPerPage,
              poolPerPage,
              { blockTag: blockNumber },
            ),
          ),
        )
      ).flat()
    }
    return []
  }
  private async getWombatGauges({
    lensContract,
    userAddress = ZERO_ADDRESS,
    blockNumber,
  }: {
    lensContract: Lens
    userAddress?: string
    blockNumber?: number
  }) {
    return lensContract.wombatGauges.staticCall(userAddress, {
      blockTag: blockNumber,
    })
  }

  private async getAllGauges({
    userAddress,
    blockNumber,
  }: {
    userAddress?: string
    blockNumber?: number
  } = {}) {
    const lensContract = Lens__factory.connect(
      contractAddresses[this.chainId]!.lens,
      this.provider,
    )
    const [canonicalPools, wombatGauges] = await Promise.all([
      this.getCanonicalPools({ lensContract, userAddress, blockNumber }),
      this.getWombatGauges({ lensContract, userAddress, blockNumber }),
    ])
    return [...canonicalPools, ...wombatGauges].map(
      this.formatGaugeData.bind(this),
    )
  }

  private async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
    tokenId?: string,
  ) {
    const poolMetadataValues = Object.values(await this.buildMetadata())
    const metadata = poolMetadataValues.find(
      (metadata) =>
        metadata?.protocolToken.address.toLowerCase() ===
          protocolTokenAddress.toLowerCase() &&
        (metadata.protocolToken.tokenId === undefined ||
          tokenId === metadata.protocolToken.tokenId),
    )
    if (!metadata) {
      throw new Error('Protocol token not found')
    }
    return metadata
  }

  private async queryRemoveLp({
    protocolTokenMetadata,
    blockNumber,
    amount,
  }: {
    protocolTokenMetadata: {
      protocolToken: VelocoreTokenMetadata
      underlyingTokens: VelocoreTokenMetadata[]
    }
    blockNumber?: number
    amount: bigint
  }) {
    const vaultContract = Vault__factory.connect(
      contractAddresses[this.chainId]!.vault,
      this.provider,
    )
    const tokenRef = [
      protocolTokenMetadata.protocolToken.tokenHash,
      ...protocolTokenMetadata.underlyingTokens.map((t) => t.tokenHash),
    ]

    const getTokenInformation = (
      index: number,
      amountType: number,
      desiredAmount: bigint,
    ) => {
      return solidityPacked(
        ['uint8', 'uint8', 'uint112', 'uint128'],
        [index, amountType, 0, desiredAmount],
      )
    }

    const queryResult = await vaultContract.query
      .staticCall(
        ZERO_ADDRESS,
        tokenRef,
        new Array(tokenRef.length).fill('0'),
        [
          {
            data: '0x00',
            poolId: `0x000000000000000000000000${protocolTokenMetadata.protocolToken.address.slice(
              2,
            )}`,
            tokenInformations: [
              getTokenInformation(0, 0, amount),
              ...protocolTokenMetadata.underlyingTokens.map((t, idx) => {
                return getTokenInformation(1 + idx, 1, 0n)
              }),
            ],
          },
        ],
        { blockTag: blockNumber },
      )
      .catch(() => {
        return []
      })
    return queryResult.slice(1)
  }
}
