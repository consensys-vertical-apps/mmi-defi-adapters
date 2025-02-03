import { getAddress } from 'ethers'
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
  AdapterSettings,
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
import { Protocol } from '../../../protocols'

const CHAIN_TO_CONFIG: Partial<
  Record<
    Chain,
    { protocolTokenAddress: string; underlyingTokenAddress: string }
  >
> = {
  [Chain.Base]: {
    protocolTokenAddress: getAddress(
      '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A', // weETH
    ),
    underlyingTokenAddress: '0x0000000000000000000000000000000000000000',
  },
  [Chain.Linea]: {
    protocolTokenAddress: getAddress(
      '0x1Bf74C010E6320bab11e2e5A532b5AC15e0b8aA6', // weETH
    ),
    underlyingTokenAddress: '0x0000000000000000000000000000000000000000',
  },
}

const WE_ETH_ADDRESS_MAINNET = getAddress(
  '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
)

export class EtherFiL2Adapter implements IProtocolAdapter {
  productId = 'l2'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
    userEvent: 'Transfer',
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
      name: 'EtherFi L2 Native Restaking',
      description: 'EtherFi defi adapter for L2 Native Restaking',
      siteUrl: 'https://app.ether.fi/',
      iconUrl: 'https://app.ether.fi/favicon/favicon-32x32.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const config = CHAIN_TO_CONFIG[this.chainId]
    if (!config) throw new Error(`No config for chain ${this.chainId}`)

    const [protocolToken, underlyingToken] = await Promise.all([
      this.helpers.getTokenMetadata(config.protocolTokenAddress),
      this.helpers.getTokenMetadata(config.underlyingTokenAddress),
    ])

    return [
      {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      },
    ]
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const balances = await this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })

    return balances.map((protocolTokenBalance) => {
      return {
        ...protocolTokenBalance, // TODO: Should be a contract position
        name: `Staked ${protocolTokenBalance.name}`,
        tokens: [
          {
            ...protocolTokenBalance,
            type: TokenType.Underlying,
          },
        ],
      }
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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

  /**
   * The weETH on L2 unwraps 1-to-1 to the weETH on mainnet,
   * because it follows the "Omnichain Fungible Token" (OFT) standard from LayerZero.
   *
   * So we can use the same rate as the Mainnet-weETH to unwrap the L2-weETH to Mainnet-eETH, and then to ETH.
   *
   * @See https://medium.com/layerzero-official/explaining-the-oft-standard-310de5e84052
   *
   * @note Disabled for now, in order to avoid undesirable cross-chain RPC calls + finding blocks by date.
   * Will be solved for in later versions using the price-adapter.
   */
  async unwrap({ blockNumber }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
    // const [protocolToken] = await this.getProtocolTokens()
    // if (!protocolToken) throw new Error('No protocol token found')

    // const underlyingToken = (protocolToken.underlyingTokens || [])[0]
    // if (!underlyingToken) throw new Error('No protocol token found')

    // const useBlockNumber = blockNumber ?? (await this.provider.getBlockNumber())
    // const l2Block = await this.provider.getBlock(useBlockNumber)
    // if (!l2Block)
    //   throw new Error(`No L2 block found with block number ${blockNumber}`)
    // if (!l2Block.date)
    //   throw new Error(
    //     `Block with number ${blockNumber} has no date, but it's needed to determine the unwrap rate`,
    //   )

    // const mainnetProvider = this.helpers.allJsonRpcProviders[Chain.Ethereum]
    // const weETHContractMainnet = WeETH__factory.connect(
    //   WE_ETH_ADDRESS_MAINNET,
    //   mainnetProvider,
    // )

    // const sameDateMainnetBlockNumber = await getBlockByDate(
    //   mainnetProvider,
    //   l2Block.date,
    // )
    // if (!sameDateMainnetBlockNumber)
    //   throw new Error('No Mainnet block with date close to L2 block')

    // // Use the rate  Mainnet-weETH -> Mainnet-eTH
    // // Then Mainnet-eTH unwraps 1-to-1 to ETH
    // const underlyingRateRaw = await weETHContractMainnet.getRate({
    //   chainId: 1,
    //   blockTag: sameDateMainnetBlockNumber.number,
    // })

    // return {
    //   baseRate: 1,
    //   type: 'protocol',
    //   ...protocolToken,
    //   tokens: [
    //     {
    //       type: 'underlying',
    //       underlyingRateRaw,
    //       ...underlyingToken,
    //     },
    //   ],
    // }
  }
}
