import { Metaplex } from '@metaplex-foundation/js'
import { getStakePoolAccount } from '@solana/spl-stake-pool'
import { AccountLayout, getMint } from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers, SolanaHelpers } from '../../../../core/helpers'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { nativeToken } from '../../../../core/utils/nativeTokens'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolDetails,
  ProtocolPosition,
  SolanaProtocolAdapterParams,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'

const JITO_STAKE_POOL = new PublicKey(
  'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb',
)

// TODO Can be extracted from stake pool address
const JITOSOL_TOKEN_ADDRESS = new PublicKey(
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
)

type AdditionalMetadata = {
  stakePool: string
}

export class JitoJitosolAdapter implements IProtocolAdapter {
  productId = 'jitosol'
  protocolId: Protocol
  chainId = Chain.Solana
  helpers: SolanaHelpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: false,
  }

  private provider: Connection

  adaptersController: AdaptersController

  constructor({
    provider,
    protocolId,
    adaptersController,
    helpers,
  }: SolanaProtocolAdapterParams) {
    this.provider = provider
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
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
    const { stakePool, underlyingTokens, ...protocolToken } = (
      await this.getProtocolTokens()
    )[0]!

    const tokenAccounts = await this.provider.getTokenAccountsByOwner(
      new PublicKey(userAddress),
      {
        mint: new PublicKey(protocolToken.address),
      },
    )

    const userBalance = tokenAccounts.value.reduce((total, accountInfo) => {
      const accountData = AccountLayout.decode(
        Uint8Array.from(accountInfo.account.data),
      )

      return total + accountData.amount
    }, 0n)

    return [
      {
        ...protocolToken,
        type: TokenType.Protocol,
        balanceRaw: userBalance,
      },
    ]
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
        10n ** BigInt(protocolToken.decimals)) /
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
