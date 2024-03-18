import { getAddress } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { TransferEvent } from '../../../../contracts/Erc20'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
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
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  GetApyInput,
  GetAprInput,
  GetConversionRateInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProtocolTokenTvl,
  ProtocolPosition,
  AssetType,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { StakedUsde__factory, Usde__factory } from '../../contracts'

export class EthenaMainAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'ethena'
  protocolId: Protocol
  chainId: Chain

  private provider: CustomJsonRpcProvider

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
      name: 'Ethena',
      description: 'Ethena USDe adapter',
      siteUrl: 'https://ethena.fi',
      iconUrl: 'https://ethena.fi/shared/ethena.svg',
      positionType: PositionType.FiatPrices,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return {
      protocolToken: await getTokenMetadata(
        getAddress('0x4c9EDD5852cd905f086C759E8383e09bff1E68B3'),
        this.chainId,
        this.provider,
      ),
      stakedToken: await getTokenMetadata(
        getAddress('0x9D39A5DE30e57443BfF2A8307A4256c8797A3497'),
        this.chainId,
        this.provider,
      ),
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const { protocolToken, stakedToken } = await this.buildMetadata()
    return [protocolToken, stakedToken]
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { protocolToken, stakedToken } = await this.buildMetadata()
    const { userAddress, protocolTokenAddresses, blockNumber } = _input
    if (!userAddress) {
      return []
    }
    const checksummedUserAddress = getAddress(userAddress)
    const positions: ProtocolPosition[] = []

    if (
      !protocolTokenAddresses ||
      protocolTokenAddresses.includes(protocolToken.address)
    ) {
      const usdeContract = Usde__factory.connect(
        protocolToken.address,
        this.provider,
      )
      const balanceRaw = await usdeContract
        .balanceOf(checksummedUserAddress, {
          blockTag: blockNumber,
        })
        .catch(() => 0n)
      const usdePosition: ProtocolPosition = {
        ...protocolToken,
        type: 'protocol',
        balanceRaw,
      }
      positions.push(usdePosition)
    }

    if (
      !protocolTokenAddresses ||
      protocolTokenAddresses.includes(stakedToken.address)
    ) {
      const susdeContract = StakedUsde__factory.connect(
        stakedToken.address,
        this.provider,
      )
      const balanceRaw = await susdeContract
        .balanceOf(checksummedUserAddress, {
          blockTag: blockNumber,
        })
        .catch(() => 0n)
      const susdePosition: ProtocolPosition = {
        ...stakedToken,
        type: 'protocol',
        balanceRaw,
      }
      positions.push(susdePosition)
    }

    return positions
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, stakedToken } = await this.buildMetadata()
    return await this.getProtocolTokenMovements({
      protocolToken:
        getAddress(protocolTokenAddress) === protocolToken.address
          ? protocolToken
          : stakedToken,

      filter: {
        fromBlock,
        toBlock,
        from: userAddress,
        to: undefined,
      },
    })
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, stakedToken } = await this.buildMetadata()
    return await this.getProtocolTokenMovements({
      protocolToken:
        getAddress(protocolTokenAddress) === protocolToken.address
          ? protocolToken
          : stakedToken,

      filter: {
        fromBlock,
        toBlock,
        from: undefined,
        to: userAddress,
      },
    })
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const { protocolToken } = await this.buildMetadata()
    const blockNumber = _input.blockNumber
    const usdeContract = Usde__factory.connect(
      protocolToken.address,
      this.provider,
    )
    const totalSupply = await usdeContract.totalSupply({
      blockTag: blockNumber,
    })

    return [
      {
        type: 'protocol',
        ...protocolToken,
        totalSupplyRaw: totalSupply,
      },
    ]
  }

  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  async getWeeklySusdeApy(blockNumber?: number): Promise<number> {
    const { stakedToken } = await this.buildMetadata()

    // sUSDe
    const susdeContract = StakedUsde__factory.connect(
      stakedToken.address,
      this.provider,
    )
    const endBlock = blockNumber ?? (await this.provider.getBlockNumber())
    const oneWeekAgoBlock = endBlock - 44800 // roughly this number of blocks per week at 13.5s block interval

    const totalAssetsStart = await susdeContract
      .totalAssets({ blockTag: oneWeekAgoBlock })
      .catch(() => 0n)

    const totalAssetsEnd = await susdeContract
      .totalAssets({ blockTag: endBlock })
      .catch(() => 0n)

    const totalSupplyStart = await susdeContract
      .totalSupply({ blockTag: oneWeekAgoBlock })
      .catch(() => 0n)

    const totalSupplyEnd = await susdeContract
      .totalSupply({ blockTag: endBlock })
      .catch(() => 0n)

    const SCALE_FACTOR = 10_000_000_000

    return (
      Number(
        (totalAssetsEnd * totalSupplyStart * BigInt(SCALE_FACTOR)) /
          (totalSupplyEnd * totalAssetsStart),
      ) /
        SCALE_FACTOR -
      1
    )
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    const { protocolToken, stakedToken } = await this.buildMetadata()
    const { protocolTokenAddress, blockNumber } = _input
    if (protocolTokenAddress === protocolToken.address) {
      return { ...protocolToken, apyDecimal: 0 }
    }

    // sUSDe
    const weeklyApy = await this.getWeeklySusdeApy(blockNumber)

    const apyDecimal = (1 + weeklyApy) ** (365 / 7) - 1

    return {
      ...stakedToken,
      apyDecimal,
    }
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    const { protocolToken, stakedToken } = await this.buildMetadata()
    const { protocolTokenAddress, blockNumber } = _input
    if (protocolTokenAddress === protocolToken.address) {
      return { ...protocolToken, aprDecimal: 0 }
    }

    // sUSDe
    const weeklyApy = await this.getWeeklySusdeApy(blockNumber)

    const aprDecimal = weeklyApy * (365 / 7)

    return {
      ...stakedToken,
      aprDecimal,
    }
  }

  async getProtocolTokenMovements({
    protocolToken,
    filter: { fromBlock, toBlock, from, to },
  }: {
    protocolToken: Erc20Metadata
    filter: {
      fromBlock: number
      toBlock: number
      from?: string
      to?: string
    }
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const filter = protocolTokenContract.filters.Transfer(from, to)

    const eventResults =
      await protocolTokenContract.queryFilter<TransferEvent.Event>(
        filter,
        fromBlock,
        toBlock,
      )

    // Temp fix to avoid timeouts
    // Remember these are on per pool basis.
    // We should monitor number
    // 20 interactions with same pool feels a healthy limit
    if (eventResults.length > 20) {
      throw new MaxMovementLimitExceededError()
    }

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value: protocolTokenMovementValueRaw },
          transactionHash,
        } = transferEvent

        return {
          transactionHash,
          protocolToken: {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
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
}
