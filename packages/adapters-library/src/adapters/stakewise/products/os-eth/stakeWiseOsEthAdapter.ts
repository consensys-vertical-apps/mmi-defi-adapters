import { getAddress, parseEther } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
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

export class StakeWiseOsEthAdapter extends SimplePoolAdapter {
  productId = 'os-eth'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false, // this might be able to be true but im not too sure just incase leaving as false
    includeInUnwrap: true,
  }

  #underlyingToken: Erc20Metadata = {
    address: ZERO_ADDRESS,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const protocolToken = await this.fetchProtocolTokenMetadata()

    return [protocolToken]
  }

  protected async fetchProtocolTokenMetadata(): Promise<Erc20Metadata> {
    const address = getAddress('0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38')

    const data: Erc20Metadata = {
      name: 'StakeWise osETH',
      symbol: 'osETH',
      decimals: 18,
      address,
    }

    return data
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    return [this.#underlyingToken]
  }

  async getTotalValueLocked(
    values: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    const { blockNumber } = values

    const [vaultsRegistryAddress, protocolToken] = await Promise.all([
      this.getVaultsRegistryAddress(),
      this.fetchProtocolTokenMetadata(),
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

    return [
      {
        ...protocolToken,
        type: TokenType.Protocol,
        totalSupplyRaw: osEthTotalSupply,
        tokens: [
          {
            ...this.#underlyingToken,
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

    return [
      {
        ...this.#underlyingToken,
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

    return [
      {
        ...this.#underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw,
      },
    ]
  }
}

// NOTE: The APY/APR feature has been removed as of March 2024.
// The below contains logic that may be useful for future features or reference. For more context on this decision, refer to ticket [MMI-4731].

// async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
//   throw new NotImplementedError()
// }

// async getApy(values: GetApyInput): Promise<ProtocolTokenApy> {
//   const { blockNumber } = values

//   const [osEthControllerAddress, protocolToken] = await Promise.all([
//     this.getOsEthControllerAddress(),
//     this.fetchProtocolTokenMetadata(),
//   ])

//   const osEthControllerContract = OsEthController__factory.connect(
//     osEthControllerAddress,
//     this.provider,
//   )

//   const rewardPerSecond = await osEthControllerContract.avgRewardPerSecond({
//     blockTag: blockNumber,
//   })

//   const apyDecimal =
//     ((Number(rewardPerSecond) * SECONDS_PER_YEAR) / Number(amount1)) * 100

//   return {
//     ...protocolToken,
//     apyDecimal,
//   }
// }
