import { getAddress } from 'ethers'
import { uniqBy } from 'lodash'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
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
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Protocol } from '../../../protocols'
import {
  AccountantWithRateProviders__factory,
  Deployer__factory,
} from '../../contracts'

const DEPLOYER_CONTRACT_ADDRESS = '0x5f2f11ad8656439d5c14d9b351f8b09cdac2a02d'
const DEPLOY_CONTRACT_TOPIC =
  '0xd928a3951eedba2f72a5eb8c15b591ead63c282f21b2f5e93506fb88cae27fec'

type AdditionalMetadata = {
  accountantContractAddress: string
}

export class EtherFiLiquidAdapter implements IProtocolAdapter {
  productId = 'liquid'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
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

  public getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'EtherFi Liquid',
      description: 'EtherFi defi adapter for Liquid vaults',
      siteUrl: 'https://app.ether.fi/',
      iconUrl: 'https://app.ether.fi/favicon/favicon-32x32.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  /**
   * We need to find all "Accountant" contracts and their associated "BoringVault".
   * - The "BoringVault" is also an ERC20, and is used to track the position / profits
   * - The "Accountant" gives the raw rate of the ERC20 in terms of the underlying
   *
   * To do so, we fetch all logs from the "Deploy" contract, which acts as a factory.
   * Then we only keep logs that contain "accountant".
   */
  @CacheToDb
  public async getProtocolTokens(): Promise<
    ProtocolToken<AdditionalMetadata>[]
  > {
    const latestBlockNumber = await this.provider.getBlockNumber()

    const bloomFilter = {
      address: DEPLOYER_CONTRACT_ADDRESS,
      topics: [DEPLOY_CONTRACT_TOPIC],
      fromBlock: 0,
      toBlock: latestBlockNumber,
    }

    const logs = await this.provider.getLogs(bloomFilter)

    const DeployerContract = Deployer__factory.connect(
      DEPLOYER_CONTRACT_ADDRESS,
      this.provider,
    )

    const parsedLogs = logs.map((log) =>
      DeployerContract.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      }),
    )

    /**
     * Each item in parsedLogs looks like this:
     *
     * {
     *   name: "ContractDeployed",
     *   args: [
     *      'Bridging Test ETH Vault Accountant With Rate Providers V1.3', // Deployed contract name
     *      '0xBA4397B2B1780097eD1B483E3C0717E0Ed4fAAa5', // Deployed contract address
     *      '0x...', // Constructor arguments
     *   ],
     *   ...
     * }
     */
    const accountantContractAddresses = parsedLogs
      .filter((log) => log?.args[0].toLocaleLowerCase().includes('accountant'))
      .map((log) => log?.args[1])

    const promises = accountantContractAddresses.map(
      async (accountantContractAddress) => {
        const accountantContract = AccountantWithRateProviders__factory.connect(
          accountantContractAddress,
          this.provider,
        )

        const [boringVaultContractAddress, underlyingTokenAddress] =
          await Promise.all([
            accountantContract.vault(),
            accountantContract.base(),
          ])

        const [protocolToken, underlyingToken] = await Promise.all([
          this.helpers.getTokenMetadata(getAddress(boringVaultContractAddress)),
          this.helpers.getTokenMetadata(getAddress(underlyingTokenAddress)),
        ])

        return {
          ...protocolToken,
          underlyingTokens: [underlyingToken],
          accountantContractAddress,
        }
      },
    )

    const protocolTokens = await Promise.all(promises)

    /**
     * TODO: Token 0x5401b8620E5FB570064CA9114fd1e135fd77D57c is twice in this list, making
     * the method AdaptersController.processDefaultCase throw an error.
     *
     * How should we handle properly?
     */
    const uniques = uniqBy(protocolTokens, 'address')

    return uniques
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  public async getPositions(
    input: GetPositionsInput,
  ): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  public async getWithdrawals({
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

  public async getDeposits({
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

  public async getTotalValueLocked({
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

  public async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const allProtocolTokens = await this.getProtocolTokens()

    const protocolToken = allProtocolTokens.find(
      (item) => item.address === protocolTokenAddress,
    )
    if (!protocolToken)
      throw new Error(`No protocol token with address ${protocolTokenAddress}`)

    const underlyingToken = (protocolToken.underlyingTokens || [])[0]
    if (!underlyingToken) throw new Error('No underlying token found')

    const accountantContract = AccountantWithRateProviders__factory.connect(
      protocolToken.accountantContractAddress,
      this.provider,
    )

    const underlyingRateRaw = await accountantContract.getRate({
      blockTag: blockNumber,
    })

    return {
      baseRate: 1,
      type: 'protocol',
      ...protocolToken,
      tokens: [
        {
          type: 'underlying',
          underlyingRateRaw,
          ...underlyingToken,
        },
      ],
    }
  }
}
