import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { Connection, PublicKey } from '@solana/web3.js'
import { getStakePoolAccount } from '@solana/spl-stake-pool'
import { AccountLayout } from '@solana/spl-token'

const SOL_TOKEN: Erc20Metadata = {
  address: 'So11111111111111111111111111111111111111112',
  name: 'Solana',
  symbol: 'SOL',
  decimals: 9,
}

// Address can be extracted from stake pool account
// decimals can be extracted using getMint
// Metadata is also uploaded as a file on-chain
const JITOSOL_TOKEN: Erc20Metadata = {
  address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  name: 'Jito SOL',
  symbol: 'JitoSOL',
  decimals: 9,
}

const JITO_STAKE_POOL = new PublicKey(
  'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb',
)
const connection = new Connection('https://api.mainnet-beta.solana.com')

export class JitoJitosolAdapter implements IProtocolAdapter {
  productId = 'jitosol'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
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

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Jito',
      description: 'Jito defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    throw new NotImplementedError()
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const userBalance = await this.getTokenAccounts(userAddress)

    // TODO Once unwrap works for Solana tokens, we can remove this and just return JitoSol balance
    const unwrapResult = await this.unwrap({
      protocolTokenAddress: JITOSOL_TOKEN.address,
      blockNumber,
    })

    const underlyingRate = unwrapResult.tokens![0]!

    return [
      {
        ...JITOSOL_TOKEN,
        type: TokenType.Protocol,
        balanceRaw: userBalance,
        tokens: [
          {
            ...SOL_TOKEN,
            type: TokenType.Underlying,
            balanceRaw:
              (userBalance * underlyingRate.underlyingRateRaw) /
              10n ** BigInt(underlyingRate.decimals),
          },
        ],
      },
    ]
  }

  private async getTokenAccounts(userAddress: string) {
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      new PublicKey(userAddress),
      {
        mint: new PublicKey(JITOSOL_TOKEN.address),
      },
    )

    const totalBalance = tokenAccounts.value.reduce((total, accountInfo) => {
      const accountData = AccountLayout.decode(
        Uint8Array.from(accountInfo.account.data),
      )

      return total + accountData.amount
    }, 0n)

    return totalBalance
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    // totalLamports is the total amount of SOL units in the pool
    // poolTokenSupply is the total amount of JitoSOL tokens in circulation
    const {
      account: {
        data: { totalLamports, poolTokenSupply },
      },
    } = await getStakePoolAccount(connection, JITO_STAKE_POOL)

    const underlyingRateRaw =
      (BigInt(totalLamports.toString()) *
        10n ** BigInt(JITOSOL_TOKEN.decimals)) /
      BigInt(poolTokenSupply.toString())

    return {
      ...JITOSOL_TOKEN,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...SOL_TOKEN,
          type: TokenType.Underlying,
          underlyingRateRaw,
        },
      ],
    }
  }
}
