import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
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
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  SolanaProtocolAdapterParams,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { Connection, PublicKey } from '@solana/web3.js'
import { getStakePoolAccount } from '@solana/spl-stake-pool'
import { AccountLayout, getMint } from '@solana/spl-token'
import { nativeToken } from '../../../../core/utils/nativeTokens'
import { Metaplex } from '@metaplex-foundation/js'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'

const SOL_TOKEN: Erc20Metadata = nativeToken[Chain.Solana]

const JITOSOL_TOKEN_ADDRESS = new PublicKey(
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
)

const JITO_STAKE_POOL = new PublicKey(
  'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb',
)

// Address can be extracted from stake pool account
// decimals can be extracted using getMint
// Metadata is also uploaded as a file on-chain
const JITOSOL_TOKEN: Erc20Metadata = {
  address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  name: 'Jito SOL',
  symbol: 'JitoSOL',
  decimals: 9,
}

type AdditionalMetadata = {
  stakePool: string
}

export class JitoJitosolAdapter implements IProtocolAdapter {
  productId = 'jitosol'
  protocolId: Protocol
  chainId = Chain.Solana
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  private provider: Connection

  adaptersController: AdaptersController

  constructor({
    provider,
    protocolId,
    adaptersController,
  }: SolanaProtocolAdapterParams) {
    this.provider = provider
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = {} as Helpers
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Jito',
      description: 'Jito defi adapter',
      siteUrl: 'https://www.jito.network/staking/',
      iconUrl: buildTrustAssetIconUrl(
        Chain.Solana,
        JITOSOL_TOKEN_ADDRESS.toString(),
      ),
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const metaplex = Metaplex.make(this.provider)

    const metadataAccount = metaplex
      .nfts()
      .pdas()
      .metadata({ mint: JITOSOL_TOKEN_ADDRESS })

    const metadataAccountInfo =
      await this.provider.getAccountInfo(metadataAccount)

    if (!metadataAccountInfo) {
      throw new Error('Metadata not found for token')
    }

    const token = await metaplex
      .nfts()
      .findByMint({ mintAddress: JITOSOL_TOKEN_ADDRESS })

    const mintInfo = await getMint(this.provider, JITOSOL_TOKEN_ADDRESS)

    return [
      {
        address: JITOSOL_TOKEN_ADDRESS.toString(),
        name: token.name,
        symbol: token.symbol,
        decimals: mintInfo.decimals,
        stakePool: JITO_STAKE_POOL.toString(),
        underlyingTokens: [nativeToken[Chain.Solana]],
      },
    ]
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
    const tokenAccounts = await this.provider.getTokenAccountsByOwner(
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

  async unwrap(input: UnwrapInput): Promise<UnwrapExchangeRate> {
    const {
      stakePool,
      underlyingTokens: [underlyingToken],
      ...protocolToken
    } = (await this.getProtocolTokens())[0]!

    // totalLamports is the total amount of SOL units in the pool
    // poolTokenSupply is the total amount of JitoSOL tokens in circulation
    const {
      account: {
        data: { totalLamports, poolTokenSupply },
      },
    } = await getStakePoolAccount(this.provider, new PublicKey(stakePool))

    const underlyingRateRaw =
      (BigInt(totalLamports.toString()) *
        10n ** BigInt(JITOSOL_TOKEN.decimals)) /
      BigInt(poolTokenSupply.toString())

    return {
      ...protocolToken,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken!,
          type: TokenType.Underlying,
          underlyingRateRaw,
        },
      ],
    }
  }
}
