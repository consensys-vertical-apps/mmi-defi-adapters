import { getAddress, parseEther } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetTotalValueLockedInput,
  PositionType,
  ProtocolDetails,
  ProtocolTokenTvl,
  TokenType,
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

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38',
)
export class StakeWiseOsEthAdapter extends SimplePoolAdapter {
  productId = 'os-eth'

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false, // this might be able to be true but im not too sure just incase leaving as false
    includeInUnwrap: true,
    userEvent: 'Transfer',
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

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const [protocolToken, underlyingToken] = await Promise.all([
      this.helpers.getTokenMetadata(PROTOCOL_TOKEN_ADDRESS),
      this.helpers.getTokenMetadata(ZERO_ADDRESS),
    ])

    return [
      {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
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
