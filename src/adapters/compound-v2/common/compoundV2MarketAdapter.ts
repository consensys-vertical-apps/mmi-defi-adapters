import { AddressLike, BigNumberish } from 'ethers'
import { SimplePoolAdapter } from '../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../core/errors/errors'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { logger } from '../../../core/utils/logger'
import {
  GetAprInput,
  ProtocolTokenApr,
  GetApyInput,
  ProtocolTokenApy,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import {
  Comptroller__factory,
  Cerc20__factory,
  CUSDCv3__factory,
} from '../contracts'

type CompoundV2MarketAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

export abstract class CompoundV2MarketAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  protected contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string; cUSDCv3Address: string }>
  > = {
    [Chain.Ethereum]: {
      comptrollerAddress: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
      cUSDCv3Address: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    },
  }

  async buildMetadata() {
    const comptrollerContract = Comptroller__factory.connect(
      this.contractAddresses[this.chainId]!.comptrollerAddress,
      this.provider,
    )

    const pools = await comptrollerContract.getAllMarkets()

    const metadataObject: CompoundV2MarketAdapterMetadata = {}

    await Promise.all(
      pools.map(async (poolContractAddress) => {
        const poolContract = Cerc20__factory.connect(
          poolContractAddress,
          this.provider,
        )

        let underlyingContractAddress: string
        try {
          underlyingContractAddress = await poolContract.underlying()
        } catch (error) {
          underlyingContractAddress = ZERO_ADDRESS
        }

        const protocolTokenPromise = getTokenMetadata(
          poolContractAddress,
          this.chainId,
          this.provider,
        )
        const underlyingTokenPromise = getTokenMetadata(
          underlyingContractAddress,
          this.chainId,
          this.provider,
        )

        const [protocolToken, underlyingToken] = await Promise.all([
          protocolTokenPromise,
          underlyingTokenPromise,
        ])

        metadataObject[protocolToken.address] = {
          protocolToken,
          underlyingToken,
        }
      }),
    )

    return metadataObject
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  protected async fetchPoolMetadata(protocolTokenAddress: string) {
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

  getTransactionParams({
    action,
    inputs,
  }: {
    action: string
    inputs: unknown[]
  }) {
    const poolContract = CUSDCv3__factory.connect(
      this.contractAddresses[this.chainId]!.cUSDCv3Address,
      this.provider,
    )

    // TODO - Needs validation
    const [asset, amount] = inputs as [AddressLike, BigNumberish]

    switch (action) {
      case 'supply': {
        return poolContract.supply.populateTransaction(asset, amount)
      }
      case 'withdraw': {
        return poolContract.withdraw.populateTransaction(asset, amount)
      }
      case 'borrow': {
        return poolContract.withdraw.populateTransaction(asset, amount)
      }
      case 'repay': {
        return poolContract.supply.populateTransaction(asset, amount)
      }

      default:
        throw new Error('Method not supported')
    }
  }
}
