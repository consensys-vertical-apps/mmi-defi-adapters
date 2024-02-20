import { parseEther } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { SECONDS_PER_YEAR } from '../../../../core/constants/SECONDS_PER_YEAR'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { NotImplementedError } from '../../../../core/errors/errors'
import {
  GetTotalValueLockedInput,
  UnderlyingTokenRate,
  ProtocolTokenTvl,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolDetails,
  PositionType,
  TokenBalance,
  GetAprInput,
  GetApyInput,
  Underlying,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  OsEth__factory,
  Vault__factory,
  VaultsRegistry__factory,
  OsEthController__factory,
} from '../../../stakewise/contracts'

const amount1 = parseEther('1')

export class StakewiseOsEthAdapter extends SimplePoolAdapter {
  productId = 'os-eth'

  #vaultsRegistryAddress = '0x3a0008a588772446f6e656133C2D5029CC4FC20E'
  #osEthControllerAddress = '0x2A261e60FB14586B474C208b1B7AC6D0f5000306'

  #protocolToken: Erc20Metadata = {
    address: '0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38',
    name: 'StakeWise osETH',
    symbol: 'osETH',
    decimals: 18,
  }

  #underlyingToken: Erc20Metadata = {
    address: ZERO_ADDRESS,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
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
    return [this.#protocolToken]
  }

  protected async fetchProtocolTokenMetadata(): Promise<Erc20Metadata> {
    return this.#protocolToken
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    return [this.#underlyingToken]
  }

  async getApy(values: GetApyInput): Promise<ProtocolTokenApy> {
    const { blockNumber } = values

    const osEthControllerContract = OsEthController__factory.connect(
      this.#osEthControllerAddress,
      this.provider,
    )

    const rewardPerSecond = await osEthControllerContract.avgRewardPerSecond({
      blockTag: blockNumber,
    })

    const apyDecimal =
      ((Number(rewardPerSecond) * SECONDS_PER_YEAR) / Number(amount1)) * 100

    return {
      ...this.#protocolToken,
      apyDecimal,
    }
  }

  async getTotalValueLocked({
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const vaultsRegistryContract = VaultsRegistry__factory.connect(
      this.#vaultsRegistryAddress,
      this.provider,
    )

    const osEthContract = OsEth__factory.connect(
      this.#protocolToken.address,
      this.provider,
    )

    const [osEthTotalSupply, topic] = await Promise.all([
      osEthContract.totalSupply({ blockTag: blockNumber }),
      vaultsRegistryContract.filters['VaultAdded(address,address)'](),
    ])

    const logs = await this.provider.getLogs({
      fromBlock: 18470079,
      toBlock: blockNumber || 'latest',
      address: this.#vaultsRegistryAddress,
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
        ...this.#protocolToken,
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

    const osEthControllerContract = OsEthController__factory.connect(
      this.#osEthControllerAddress,
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

  protected async getUnderlyingTokenConversionRate(
    _: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnderlyingTokenRate[]> {
    const osEthControllerContract = OsEthController__factory.connect(
      this.#osEthControllerAddress,
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

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }
}
