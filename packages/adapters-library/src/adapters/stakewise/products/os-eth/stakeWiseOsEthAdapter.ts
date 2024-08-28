import { getAddress, parseEther } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetTotalValueLockedInput,
  PositionType,
  ProtocolDetails,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  OsEthController__factory,
  OsEth__factory,
  Vault__factory,
  VaultsRegistry__factory,
} from '../../contracts'

const amount1 = parseEther('1')

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
}

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38',
)
export class StakeWiseOsEthAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'os-eth'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false, // this might be able to be true but im not too sure just incase leaving as false
    includeInUnwrap: true,
    version: 2,
  }

  private async getVaultsRegistryAddress(): Promise<string> {
    const address = getAddress('0x3a0008a588772446f6e656133C2D5029CC4FC20E')

    return address
  }

  private async getOsEthControllerAddress(): Promise<string> {
    const address = getAddress('0x2A261e60FB14586B474C208b1B7AC6D0f5000306')

    return address
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      name: 'StakeWise',
      siteUrl: 'https://app.stakewise.io/',
      iconUrl: 'https://app.stakewise.io/osETH.svg',
      description: 'StakeWise DeFi Adapter for osETH',
      positionType: PositionType.Staked,
      protocolId: this.protocolId,
      productId: this.productId,
      chainId: this.chainId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    return [
      {
        name: 'StakeWise osETH',
        symbol: 'osETH',
        decimals: 18,
        address: PROTOCOL_TOKEN_ADDRESS,
        underlyingTokens: [
          {
            address: ZERO_ADDRESS,
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
          },
        ],
      },
    ]
  }

  async getTotalValueLocked(
    values: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const { blockNumber } = values

    const [vaultsRegistryAddress, protocolToken] = await Promise.all([
      this.getVaultsRegistryAddress(),
      this.fetchProtocolTokenMetadata(PROTOCOL_TOKEN_ADDRESS),
    ])

    const vaultsRegistryContract = VaultsRegistry__factory.connect(
      vaultsRegistryAddress,
      this.provider,
    )

    const osEthContract = OsEth__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const [osEthTotalSupply, topic] = await Promise.all([
      osEthContract.totalSupply({ blockTag: blockNumber }),
      vaultsRegistryContract.filters['VaultAdded(address,address)'](),
    ])

    const vaultsRegistryDeploymentBlock = 18470079
    const logs = await this.provider.getLogs({
      fromBlock: vaultsRegistryDeploymentBlock,
      toBlock: blockNumber || 'latest',
      address: vaultsRegistryAddress,
      topics: await topic.getTopicFilter(),
    })

    const vaultsAddresses: string[] = logs.map((log) => {
      const parsedLog = vaultsRegistryContract.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      })

      return parsedLog?.args[1] || ZERO_ADDRESS
    })

    const vaultsSupplies = await Promise.all(
      vaultsAddresses.map((address) => {
        const vaultContract = Vault__factory.connect(address, this.provider)

        return vaultContract.totalAssets({ blockTag: blockNumber })
      }),
    )

    const underlyingTokenSupply = vaultsSupplies.reduce(
      (acc, value) => acc + value,
      0n,
    )

    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    return [
      {
        ...protocolToken,
        type: TokenType.Protocol,
        totalSupplyRaw: osEthTotalSupply,
        tokens: [
          {
            ...underlyingTokens[0]!,
            totalSupplyRaw: underlyingTokenSupply,
            type: TokenType.Underlying,
          },
        ],
      },
    ]
  }

  protected async getUnderlyingTokenBalances(values: {
    protocolTokenBalance: TokenBalance
    blockNumber?: number
    userAddress: string
  }): Promise<Underlying[]> {
    const { protocolTokenBalance, blockNumber } = values

    const osEthControllerAddress = await this.getOsEthControllerAddress()

    const osEthControllerContract = OsEthController__factory.connect(
      osEthControllerAddress,
      this.provider,
    )

    const balanceRaw = await osEthControllerContract.convertToAssets(
      protocolTokenBalance.balanceRaw,
      { blockTag: blockNumber },
    )

    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    return [
      {
        ...underlyingTokens[0]!,
        type: TokenType.Underlying,
        balanceRaw,
      },
    ]
  }

  protected async unwrapProtocolToken(
    _: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const osEthControllerAddress = await this.getOsEthControllerAddress()

    const osEthControllerContract = OsEthController__factory.connect(
      osEthControllerAddress,
      this.provider,
    )

    const underlyingRateRaw = await osEthControllerContract.convertToAssets(
      amount1,
      { blockTag: blockNumber },
    )

    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    return [
      {
        ...underlyingTokens[0]!,
        type: TokenType.Underlying,
        underlyingRateRaw,
      },
    ]
  }
}
