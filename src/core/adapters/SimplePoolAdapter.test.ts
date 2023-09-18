import { ethers, formatUnits } from 'ethers'
import { Protocol } from '../../adapters'
import {
  ProtocolDetails,
  MovementsByBlock,
  ProtocolTotalValueLockedToken,
  ProtocolApyToken,
  ProtocolAprToken,
  TokenBalance,
  BaseToken,
  BasePricePerShareToken,
  TokenType,
} from '../../types/adapter'
import { Chain } from '../constants/chains'
import { Erc20Metadata } from '../utils/getTokenMetadata'
import { SimplePoolAdapter } from './SimplePoolAdapter'

jest.mock('../utils/getBalances', () => ({
  getBalances: jest.fn(() =>
    Promise.resolve([
      {
        address: '0xprotocolTokenETHUSDC',
        name: 'Coin-LP-ETH-USDC',
        symbol: 'S*ETH-USDC',
        decimals: 6,
        balanceRaw: 10000000n,
        balance: 10,
      },
      {
        address: '0xprotocolTokenETHUSDT',
        name: 'Coin-LP-ETH-USDT',
        symbol: 'S*ETH-USDT',
        decimals: 6,
        balanceRaw: 20000000n,
        balance: 20,
      },
    ]),
  ),
}))

class SimplePoolAdapterImplementation extends SimplePoolAdapter {
  private metadata: Record<
    string,
    { protocolToken: Erc20Metadata; underlyingTokens: Erc20Metadata[] }
  > = {
    '0xprotocolTokenETHUSDC': {
      protocolToken: {
        address: '0xprotocolTokenETHUSDC',
        name: 'Coin-LP-ETH-USDC',
        symbol: 'S*ETH-USDC',
        decimals: 6,
      },
      underlyingTokens: [
        {
          address: '0x0',
          name: 'ETH',
          symbol: 'ETH',
          decimals: 18,
        },
        {
          address: '0xtokenAddressUSDC',
          name: 'USDC',
          symbol: 'USDC',
          decimals: 6,
        },
      ],
    },
    '0xprotocolTokenETHUSDT': {
      protocolToken: {
        address: '0xprotocolTokenETHUSDT',
        name: 'Coin-LP-ETH-USDT',
        symbol: 'S*ETH-USDT',
        decimals: 6,
      },
      underlyingTokens: [
        {
          address: '0x0',
          name: 'ETH',
          symbol: 'ETH',
          decimals: 18,
        },
        {
          address: '0xtokenAddressUSDT',
          name: 'USDT',
          symbol: 'USDT',
          decimals: 6,
        },
      ],
    },
  }
  getProtocolDetails(): ProtocolDetails {
    throw new Error('Method not implemented.')
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(this.metadata).map((pool) => pool.protocolToken)
  }

  getClaimedRewards(): Promise<MovementsByBlock[]> {
    throw new Error('Method not implemented.')
  }
  getTotalValueLocked(): Promise<ProtocolTotalValueLockedToken[]> {
    throw new Error('Method not implemented.')
  }
  getApy(): Promise<ProtocolApyToken> {
    throw new Error('Method not implemented.')
  }
  getApr(): Promise<ProtocolAprToken> {
    throw new Error('Method not implemented.')
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    return (await this.getProtocolTokens()).find(
      (token) => token.address === protocolTokenAddress,
    )!
  }

  protected async getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    return this.metadata[protocolTokenAddress]!.underlyingTokens
  }

  protected async getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
  ): Promise<BaseToken[]> {
    const underlyingTokens = await this.getUnderlyingTokens(
      protocolTokenBalance.address,
    )

    return underlyingTokens.map((underlyingToken) => {
      const underlyingTokenBalanceRaw = protocolTokenBalance.balanceRaw / 2n
      return {
        ...underlyingToken,
        balanceRaw: underlyingTokenBalanceRaw,
        balance: formatUnits(
          underlyingTokenBalanceRaw,
          underlyingToken.decimals,
        ),
        type: TokenType.Underlying,
      }
    })
  }

  protected getUnderlyingTokenPricesPerShare(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<BasePricePerShareToken[]> {
    throw new Error('Method not implemented.')
  }
}

describe('SimplePoolAdapter', () => {
  describe('getPositions', () => {
    it('returns underlying positions', async () => {
      const providerMock = jest.fn()
      const adapter = new SimplePoolAdapterImplementation({
        chainId: Chain.Ethereum,
        protocolId: 'TEST' as Protocol,
        provider: providerMock as unknown as ethers.JsonRpcProvider,
      })

      const result = await adapter.getPositions({
        userAddress: '0xuseraddress',
      })

      expect(result).toBeDefined()
    })
  })
})
