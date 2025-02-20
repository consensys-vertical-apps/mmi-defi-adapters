import { getAddress } from 'ethers'
import { min } from 'evm-maths/lib/utils'
import { AdaptersController } from '../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../core/constants/chains'
import { CacheToDb } from '../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../core/errors/errors'
import { Helpers } from '../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import {
  AToken__factory,
  AaveV3Pool__factory,
  MorphoAaveV3__factory,
} from '../../morpho-aave-v2/contracts'
import { SuppliedEvent } from '../../morpho-aave-v2/contracts/MorphoAaveV3'
import {
  TypedContractEvent,
  TypedDeferredTopicFilter,
} from '../../morpho-aave-v2/contracts/common'
import { Protocol } from '../../protocols'
import { MorphoAaveMath } from '../internal-utils/AaveV3.maths'
import P2PInterestRates from '../internal-utils/P2PInterestRates'

const morphoAaveV3ContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoAaveV3]: {
    [Chain.Ethereum]: getAddress('0x33333aea097c193e66081e930c33020272b33333'),
  },
}

export abstract class MorphoBasePoolAdapter implements IProtocolAdapter {
  abstract productId: string
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  abstract adapterSettings: AdapterSettings

  private provider: CustomJsonRpcProvider

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

  __IRM__ = new P2PInterestRates()
  __MATH__ = new MorphoAaveMath()
  oracleAddress = getAddress('0xA50ba011c48153De246E5192C8f9258A2ba79Ca9')
  poolAddress = getAddress('0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2')

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const morphoAaveV3Contract = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const markets = await morphoAaveV3Contract.marketsCreated()
    const positionType = this.getProtocolDetails().positionType
    return await Promise.all(
      markets.map(async (marketAddress) => {
        // Morpho AaveV3-ETH Optimizer allows a borrow only on WETH
        if (positionType === PositionType.Borrow) {
          const [protocolToken, underlyingToken] = await Promise.all([
            getTokenMetadata(
              '0x4d5f47fa6a74757f35c14fd3a6ef8e3c9bc514e8',
              this.chainId,
              this.provider,
            ),
            getTokenMetadata(
              '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              this.chainId,
              this.provider,
            ),
          ])
          return {
            ...protocolToken,
            underlyingTokens: [underlyingToken],
          }
        }

        const pool = AaveV3Pool__factory.connect(
          this.poolAddress,
          this.provider,
        )
        const aTokenAddress = (await pool.getReserveData(marketAddress))
          .aTokenAddress

        const aTokenContract = AToken__factory.connect(
          aTokenAddress,
          this.provider,
        )

        const supplyTokenAddress = await aTokenContract
          .UNDERLYING_ASSET_ADDRESS()
          .catch((err) => {
            if (err) return ZERO_ADDRESS
            throw err
          })

        const [protocolToken, underlyingToken] = await Promise.all([
          getTokenMetadata(aTokenAddress, this.chainId, this.provider),
          getTokenMetadata(supplyTokenAddress, this.chainId, this.provider),
        ])

        return {
          ...protocolToken,
          underlyingTokens: [underlyingToken],
        }
      }),
    )
  }

  private async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const {
      underlyingTokens: [underlyingToken],
    } = await this.getProtocolTokenByAddress(protocolTokenBalance.address)

    const underlyingTokenBalance = {
      ...underlyingToken!,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const morphoAaveV3 = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const tokens = await this.getProtocolTokens()
    const positionType = this.getProtocolDetails().positionType

    const getBalance = async (
      market: Erc20Metadata,
      userAddress: string,
      blockNumber: number,
    ): Promise<bigint> => {
      let balanceRaw: bigint
      if (positionType === PositionType.Supply) {
        const [supplyBalance, collateralBalance] = await Promise.all([
          morphoAaveV3.supplyBalance(market.address, userAddress, {
            blockTag: blockNumber,
          }),
          morphoAaveV3.collateralBalance(market.address, userAddress, {
            blockTag: blockNumber,
          }),
        ])
        balanceRaw = supplyBalance + collateralBalance
      } else {
        balanceRaw = await morphoAaveV3.borrowBalance(
          market.address,
          userAddress,
          {
            blockTag: blockNumber,
          },
        )
      }
      return balanceRaw
    }

    const protocolTokensBalances = await Promise.all(
      tokens.map(async (market) => {
        const {
          underlyingTokens: [underlyingToken],
        } = await this.getProtocolTokenByAddress(market.address)

        const amount = await getBalance(
          underlyingToken!,
          userAddress,
          blockNumber!,
        )
        return {
          address: market.address,
          balance: amount,
        }
      }),
    )

    const protocolTokens: ProtocolPosition[] = await Promise.all(
      protocolTokensBalances
        .filter((protocolTokenBalance) => protocolTokenBalance.balance !== 0n) // Filter out balances equal to 0
        .map(async (protocolTokenBalance) => {
          const protocolToken = await this.getProtocolTokenByAddress(
            protocolTokenBalance.address,
          )

          const completeTokenBalance: TokenBalance = {
            address: protocolTokenBalance.address,
            balanceRaw: protocolTokenBalance.balance,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          }

          const underlyingTokenBalances = await this.getUnderlyingTokenBalances(
            {
              userAddress,
              protocolTokenBalance: completeTokenBalance,
              blockNumber,
            },
          )

          return {
            ...protocolTokenBalance,
            balanceRaw: protocolTokenBalance.balance,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
            type: TokenType.Protocol,
            tokens: underlyingTokenBalances,
          }
        }),
    )
    return protocolTokens
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
