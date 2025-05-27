import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import { EthenaLpStaking__factory } from '../../contracts'

const LP_STAKING_CONTRACT_ADDRESS = getAddress(
  '0x8707f238936c12c309bfc2B9959C35828AcFc512',
)

export class EthenaLpStakingAdapter implements IProtocolAdapter {
  productId = 'lp-staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Ethena LP Staking',
      description: 'Ethena defi adapter',
      siteUrl: 'https://ethena.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x57e114b691db790c35207b2e685d4a43181e6061/logo.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const lpStakingContract = EthenaLpStaking__factory.connect(
      LP_STAKING_CONTRACT_ADDRESS,
      this.provider,
    )

    const filter = lpStakingContract.filters.StakeParametersUpdated()
    const events = await lpStakingContract.queryFilter(filter)

    const lpTokens = await Promise.all(
      [...new Set(events.map((event) => event.args.lpToken))].map(
        async (lpToken) => {
          return {
            ...(await getTokenMetadata(lpToken, this.chainId, this.provider)),
            underlyingTokens: [],
          }
        },
      ),
    )

    return lpTokens
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const lpStakingContract = EthenaLpStaking__factory.connect(
      LP_STAKING_CONTRACT_ADDRESS,
      this.provider,
    )

    const protocolTokens = await this.getProtocolTokens()

    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const userStake = await lpStakingContract.stakes(
        userAddress,
        protocolToken.address,
        { blockTag: blockNumber },
      )

      if (!userStake.stakedAmount) {
        return undefined
      }

      return {
        type: TokenType.Protocol, // TODO: Should be a contract position
        address: protocolToken.address,
        name: `Staked ${protocolToken.name}`,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        balanceRaw: userStake.stakedAmount,
        tokens: [
          {
            type: TokenType.Underlying,
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
            balanceRaw: userStake.stakedAmount,
          },
        ],
      }
    })
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
