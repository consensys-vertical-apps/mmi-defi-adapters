import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import {
  GatewayImplementation__factory,
  DToken__factory,
  OracleImplementation__factory,
} from '../../contracts'

const contractAddresses: Partial<
  Record<
    Chain,
    {
      mainGateway: string
      mainLToken: string
      mainPToken: string
      innoGateway: string
      innoLToken: string
      innoPToken: string
      oracle: string
      tokenB0: string
    }
  >
> = {
  [Chain.Arbitrum]: {
    mainGateway: '0x7c4a640461427c310a710d367c2ba8c535a7ef81',
    mainLToken: '0xd849c2b7991060023e5d92b92c68f4077ae2c2ba',
    mainPToken: '0x3330664fe007463ddc859830b2d96380440c3a24',
    innoGateway: '0xc38bcd426b3c88f80b3f3ca35957e256bbb704be',
    innoLToken: '0x48e33d67d286fd1901693c66d16494192ece9fa6',
    innoPToken: '0x9e5b500e6705c1a6f35812e93eef12e4f3672912',
    oracle: '0xd3d89af508590f3b43a476f0ed7295a8749f730e',
    tokenB0: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  },
  [Chain.Linea]: {
    mainGateway: '0xe840bb03fe58540841e6ebee94264d5317b88866',
    mainLToken: '0xc79102c36bbba246b8bb6ae81b50ba8544e45174',
    mainPToken: '0x5a9dbbc5e6bd9ecdf81d48580d861653f12ea91e',
    innoGateway: '0xd91cea5b209a3c327f72283c803b60bac2c2d8b3',
    innoLToken: '0x5bb30e7d81507cf171f16ebeefbdd0e287e60a4f',
    innoPToken: '0x14200cc7446d9fb32f75dff1526699cd164d7c47',
    oracle: '0x3b823dc7087d1ba9778ab8161b791b59053a0941',
    tokenB0: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
  },
  [Chain.Bsc]: {
    mainGateway: '0x2c2e1ee20c633eae18239c0bf59cef1fc44939ac',
    mainLToken: '0xabfc820798095f3e4bd9626db6f8ad7d57a5c76a',
    mainPToken: '0x28a41c9eb8d0a9055de1644f9c4408f873c8550f',
    innoGateway: '0xab43c2eb56b63aad8f9a54107d0c9fde72d45ab9',
    innoLToken: '0x053e95113780ddf39b54baf53820f9f415038a45',
    innoPToken: '0x4cb0df0611045dd5d546fc622d61fdcb5d869170',
    oracle: '0xb7f803712f5b389d6f009f733916e18f9429e9d5',
    tokenB0: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  },
}

export class DeriPoolAdapter extends SimplePoolAdapter {
  productId = 'pool'
  protocolId: Protocol
  chainId: Chain

  adaptersController: AdaptersController

  provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    super({
      provider,
      chainId,
      protocolId,
      adaptersController,
      helpers,
    })
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  protected async fetchProtocolTokenMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    throw new NotImplementedError()
  }

  protected async fetchUnderlyingTokensMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }
  protected async unwrapProtocolToken(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    throw new NotImplementedError()
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Deri',
      description: 'Deri defi adapter',
      siteUrl: 'https://deri.io',
      iconUrl: 'https://deri.io/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  async getPositions({
    userAddress,
    blockNumber,
    tokenIds: tokenIdsRaw,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const tokenIds =
      tokenIdsRaw?.map((tokenId) => BigInt(tokenId)) ??
      (await this.getTokenIds(userAddress, blockNumber))

    return filterMapAsync(tokenIds, async (tokenId) => {
      try {
        const hexTokenId = tokenId.toString(16)

        if (hexTokenId.startsWith('1')) {
          return await this.getLTokenPosition(
            contractAddresses[this.chainId]!.mainGateway,
            contractAddresses[this.chainId]!.mainLToken,
            tokenId,
            blockNumber,
          )
        } else if (hexTokenId.startsWith('2')) {
          return await this.getPTokenPosition(
            contractAddresses[this.chainId]!.mainGateway,
            contractAddresses[this.chainId]!.mainPToken,
            tokenId,
            blockNumber,
          )
        } else if (hexTokenId.startsWith('3')) {
          return await this.getLTokenPosition(
            contractAddresses[this.chainId]!.innoGateway,
            contractAddresses[this.chainId]!.innoLToken,
            tokenId,
            blockNumber,
          )
        } else if (hexTokenId.startsWith('4')) {
          return await this.getPTokenPosition(
            contractAddresses[this.chainId]!.innoGateway,
            contractAddresses[this.chainId]!.innoPToken,
            tokenId,
            blockNumber,
          )
        }
      } catch (error) {
        // if token isnt minted
        return undefined
      }
    })
  }

  private async getTokenIds(
    userAddress: string,
    blockNumber: number | undefined,
  ): Promise<bigint[]> {
    const dTokens = [
      contractAddresses[this.chainId]!.mainLToken,
      contractAddresses[this.chainId]!.mainPToken,
      contractAddresses[this.chainId]!.innoLToken,
      contractAddresses[this.chainId]!.innoPToken,
    ]
    let tokenIds: bigint[] = []

    for (let dToken of dTokens) {
      const tokenContract = DToken__factory.connect(dToken, this.provider)

      const transferFilter = tokenContract.filters.Transfer(
        undefined,
        userAddress,
        undefined,
      )

      const transferEventsRaw = await tokenContract.queryFilter(
        transferFilter,
        undefined,
        blockNumber,
      )

      for (let log of transferEventsRaw) {
        const tokenId = log.args.tokenId
        if (
          getAddress(
            await tokenContract.ownerOf(tokenId, {
              blockTag: blockNumber,
            }),
          ) === getAddress(userAddress)
        ) {
          tokenIds.push(tokenId)
        }
      }
    }

    return tokenIds
  }

  private async getLTokenPosition(
    gateway: string,
    lToken: string,
    tokenId: bigint,
    blockNumber: number | undefined,
  ): Promise<ProtocolPosition | undefined> {
    const gatewayContract = GatewayImplementation__factory.connect(
      gateway,
      this.provider,
    )
    const lpState = await gatewayContract
      .getLpState(tokenId, {
        blockTag: blockNumber,
      })
      .catch((error) => {
        // if token isnt minted
        return undefined
      })

    if (!lpState) {
      return undefined
    }

    let bToken = lpState.bToken

    const bTokenState = await gatewayContract.getBTokenState(bToken, {
      blockTag: blockNumber,
    })

    const oracleContract = OracleImplementation__factory.connect(
      contractAddresses[this.chainId]!.oracle,
      this.provider,
    )

    const bTokenOracleValue = await oracleContract.getValue(
      bTokenState.oracleId,
      {
        blockTag: blockNumber,
      },
    )

    if (bToken === '0x0000000000000000000000000000000000000001') {
      bToken = getAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    }

    const bTokenMetadata = await getTokenMetadata(
      bToken,
      this.chainId,
      this.provider,
    )

    let b0Included = false
    let bAmount = lpState.bAmount
    if (
      getAddress(bToken) ===
      getAddress(contractAddresses[this.chainId]!.tokenB0)
    ) {
      bAmount += lpState.b0Amount
      b0Included = true
    }

    let tokens = [
      this.createUnderlyingToken(
        bToken,
        bTokenMetadata,
        bAmount,
        TokenType.Underlying,
      ),
    ]

    if (lpState.b0Amount > 0 && !b0Included) {
      const b0Metadata = await getTokenMetadata(
        contractAddresses[this.chainId]!.tokenB0,
        this.chainId,
        this.provider,
      )
      tokens.push(
        this.createUnderlyingToken(
          contractAddresses[this.chainId]!.tokenB0,
          b0Metadata,
          lpState.b0Amount,
          TokenType.Underlying,
        ),
      )
    }

    let balanceRaw = 0n

    tokens.forEach((token) => {
      if (
        token.address === getAddress(contractAddresses[this.chainId]!.tokenB0)
      ) {
        balanceRaw +=
          (token.balanceRaw * BigInt(10 ** 18)) / BigInt(10 ** token.decimals)
      } else {
        balanceRaw +=
          (token.balanceRaw * bTokenOracleValue) / BigInt(10 ** token.decimals)
      }
    })

    return {
      address: lToken,
      tokenId: tokenId.toString(),
      name: 'DLT',
      symbol: 'DLT',
      decimals: 18,
      balanceRaw: balanceRaw,
      type: TokenType.Protocol,
      tokens: tokens,
    }
  }

  private async getPTokenPosition(
    gateway: string,
    pToken: string,
    tokenId: bigint,
    blockNumber: number | undefined,
  ): Promise<ProtocolPosition | undefined> {
    const gatewayContract = GatewayImplementation__factory.connect(
      gateway,
      this.provider,
    )
    const tdState = await gatewayContract
      .getTdState(tokenId, {
        blockTag: blockNumber,
      })
      .catch((error) => {
        // if token isnt minted
        return undefined
      })

    if (!tdState) {
      return undefined
    }

    let bToken = tdState.bToken

    const bTokenState = await gatewayContract.getBTokenState(bToken, {
      blockTag: blockNumber,
    })

    const oracleContract = OracleImplementation__factory.connect(
      contractAddresses[this.chainId]!.oracle,
      this.provider,
    )

    const bTokenOracleValue = await oracleContract.getValue(
      bTokenState.oracleId,
      {
        blockTag: blockNumber,
      },
    )

    // ETH address
    if (bToken === '0x0000000000000000000000000000000000000001') {
      bToken = getAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    }

    const bTokenMetadata = await getTokenMetadata(
      bToken,
      this.chainId,
      this.provider,
    )

    let bAmount = tdState.bAmount
    let b0Included = false
    if (
      getAddress(bToken) ===
      getAddress(contractAddresses[this.chainId]!.tokenB0)
    ) {
      bAmount += tdState.b0Amount
      b0Included = true
    }

    const token = this.createUnderlyingToken(
      bToken,
      bTokenMetadata,
      bAmount,
      TokenType.Underlying,
    )

    let tokens = [token]
    if (tdState.b0Amount > 0 && !b0Included) {
      const b0Metadata = await getTokenMetadata(
        contractAddresses[this.chainId]!.tokenB0,
        this.chainId,
        this.provider,
      )
      tokens.push(
        this.createUnderlyingToken(
          contractAddresses[this.chainId]!.tokenB0,
          b0Metadata,
          tdState.b0Amount,
          TokenType.Underlying,
        ),
      )
    }

    let balanceRaw = 0n

    tokens.forEach((token) => {
      if (
        token.address === getAddress(contractAddresses[this.chainId]!.tokenB0)
      ) {
        balanceRaw +=
          (token.balanceRaw * BigInt(10 ** 18)) / BigInt(10 ** token.decimals)
      } else {
        balanceRaw +=
          (token.balanceRaw * bTokenOracleValue) / BigInt(10 ** token.decimals)
      }
    })

    return {
      address: pToken,
      tokenId: tokenId.toString(),
      name: 'DPT',
      symbol: 'DPT',
      decimals: 18,
      balanceRaw: balanceRaw,
      type: TokenType.Protocol,
      tokens: tokens,
    }
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required for deposits')
    }

    const hexTokenId = BigInt(tokenId).toString(16)

    if (hexTokenId.startsWith('1')) {
      return await this.getLTokenWithdrawlMovements(
        contractAddresses[this.chainId]!.mainGateway,
        protocolTokenAddress,
        fromBlock,
        toBlock,
        tokenId,
      )
    } else if (hexTokenId.startsWith('2')) {
      return await this.getPTokenWithdrawlMovements(
        contractAddresses[this.chainId]!.mainGateway,
        protocolTokenAddress,
        fromBlock,
        toBlock,
        tokenId,
      )
    } else if (hexTokenId.startsWith('3')) {
      return await this.getLTokenWithdrawlMovements(
        contractAddresses[this.chainId]!.innoGateway,
        protocolTokenAddress,
        fromBlock,
        toBlock,
        tokenId,
      )
    } else if (hexTokenId.startsWith('4')) {
      return await this.getPTokenWithdrawlMovements(
        contractAddresses[this.chainId]!.innoGateway,
        protocolTokenAddress,
        fromBlock,
        toBlock,
        tokenId,
      )
    }
    return []
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required for deposits')
    }

    const hexTokenId = BigInt(tokenId).toString(16)

    if (hexTokenId.startsWith('1')) {
      return await this.getLTokenDepositMovements(
        contractAddresses[this.chainId]!.mainGateway,
        protocolTokenAddress,
        fromBlock,
        toBlock,
        tokenId,
      )
    } else if (hexTokenId.startsWith('2')) {
      return await this.getPTokenDepositMovements(
        contractAddresses[this.chainId]!.mainGateway,
        protocolTokenAddress,
        fromBlock,
        toBlock,
        tokenId,
      )
    } else if (hexTokenId.startsWith('3')) {
      return await this.getLTokenDepositMovements(
        contractAddresses[this.chainId]!.innoGateway,
        protocolTokenAddress,
        fromBlock,
        toBlock,
        tokenId,
      )
    } else if (hexTokenId.startsWith('4')) {
      return await this.getPTokenDepositMovements(
        contractAddresses[this.chainId]!.innoGateway,
        protocolTokenAddress,
        fromBlock,
        toBlock,
        tokenId,
      )
    }
    return []
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private createUnderlyingToken(
    address: string,
    metadata: Erc20Metadata,
    balanceRaw: bigint,
    type: typeof TokenType.Underlying | typeof TokenType.UnderlyingClaimable,
  ): Underlying {
    return {
      address,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      balanceRaw,
      type,
    }
  }

  private async getLTokenDepositMovements(
    gateway: string,
    lToken: string,
    fromBlock: number,
    toBlock: number,
    tokenId: string,
  ): Promise<MovementsByBlock[]> {
    const gatewayContract = GatewayImplementation__factory.connect(
      gateway,
      this.provider,
    )

    const addFilter = gatewayContract.filters.RequestUpdateLiquidity()

    const addEventsRaw = (
      await gatewayContract.queryFilter(addFilter, fromBlock, toBlock)
    ).filter(
      (eventData) =>
        eventData.args.lTokenId.toString() === tokenId &&
        eventData.args.removeBAmount === 0n,
    )
    return await Promise.all(
      addEventsRaw.map(async (addEvent) => {
        const { blockNumber, transactionHash } = addEvent

        const lpState = await gatewayContract.getLpState(tokenId, {
          blockTag: blockNumber,
        })

        let bToken = lpState.bToken

        // ETH address
        if (bToken === '0x0000000000000000000000000000000000000001') {
          bToken = getAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
        }

        const bTokenMetadata = await getTokenMetadata(
          bToken,
          this.chainId,
          this.provider,
        )

        let bAmount = lpState.bAmount
        let b0Amount = lpState.b0Amount

        let noValueBefore = false
        const lpStateBefore = await gatewayContract
          .getLpState(tokenId, { blockTag: blockNumber - 1 }) // Encountered failures if nft not yet minted
          .catch((error) => {
            noValueBefore = true
          })

        if (!noValueBefore && lpStateBefore) {
          bAmount -= lpStateBefore.bAmount
          b0Amount -= lpStateBefore.b0Amount
        }

        let b0Included = false
        if (
          getAddress(bToken) ===
          getAddress(contractAddresses[this.chainId]!.tokenB0)
        ) {
          bAmount += lpState.b0Amount
          b0Included = true
        }

        let tokens = [
          {
            type: TokenType.Underlying,
            balanceRaw: bAmount,
            ...bTokenMetadata,
            transactionHash,
            blockNumber,
          },
        ]

        if (lpState.b0Amount > 0 && !b0Included) {
          const b0Metadata = await getTokenMetadata(
            contractAddresses[this.chainId]!.tokenB0,
            this.chainId,
            this.provider,
          )
          tokens.push({
            type: TokenType.Underlying,
            balanceRaw: b0Amount,
            ...b0Metadata,
            transactionHash,
            blockNumber,
          })
        }

        return {
          transactionHash,
          protocolToken: {
            address: lToken,
            name: 'DLT',
            symbol: 'DLT',
            decimals: 18,
            tokenId,
          },
          tokens: tokens,
          blockNumber,
        }
      }),
    )
  }

  private async getLTokenWithdrawlMovements(
    gateway: string,
    lToken: string,
    fromBlock: number,
    toBlock: number,
    tokenId: string,
  ): Promise<MovementsByBlock[]> {
    const gatewayContract = GatewayImplementation__factory.connect(
      gateway,
      this.provider,
    )

    const removeFilter = gatewayContract.filters.FinishRemoveLiquidity()

    const addEventsRaw = (
      await gatewayContract.queryFilter(removeFilter, fromBlock, toBlock)
    ).filter((eventData) => eventData.args.lTokenId.toString() === tokenId)
    return await Promise.all(
      addEventsRaw.map(async (addEvent) => {
        const { blockNumber, transactionHash } = addEvent

        const lpState = await gatewayContract.getLpState(tokenId, {
          blockTag: blockNumber,
        })

        let bToken = lpState.bToken

        // ETH address
        if (bToken === '0x0000000000000000000000000000000000000001') {
          bToken = getAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
        }
        const bTokenMetadata = await getTokenMetadata(
          bToken,
          this.chainId,
          this.provider,
        )

        let bAmount = lpState.bAmount
        let b0Amount = lpState.b0Amount

        let noValueBefore = false
        const lpStateBefore = await gatewayContract.getLpState(tokenId, {
          blockTag: blockNumber - 1,
        })

        if (!noValueBefore && lpStateBefore) {
          bAmount = lpStateBefore.bAmount - bAmount
          b0Amount = lpStateBefore.b0Amount - b0Amount
        }

        let b0Included = false
        if (
          getAddress(bToken) ===
          getAddress(contractAddresses[this.chainId]!.tokenB0)
        ) {
          bAmount += lpState.b0Amount
          b0Included = true
        }

        let tokens = [
          {
            type: TokenType.Underlying,
            balanceRaw: bAmount,
            ...bTokenMetadata,
            transactionHash,
            blockNumber,
          },
        ]

        if (lpState.b0Amount > 0 && !b0Included) {
          const b0Metadata = await getTokenMetadata(
            contractAddresses[this.chainId]!.tokenB0,
            this.chainId,
            this.provider,
          )
          tokens.push({
            type: TokenType.Underlying,
            balanceRaw: b0Amount,
            ...b0Metadata,
            transactionHash,
            blockNumber,
          })
        }

        return {
          transactionHash,
          protocolToken: {
            address: lToken,
            name: 'DLT',
            symbol: 'DLT',
            decimals: 18,
            tokenId,
          },
          tokens: tokens,
          blockNumber,
        }
      }),
    )
  }

  private async getPTokenDepositMovements(
    gateway: string,
    lToken: string,
    fromBlock: number,
    toBlock: number,
    tokenId: string,
  ): Promise<MovementsByBlock[]> {
    const gatewayContract = GatewayImplementation__factory.connect(
      gateway,
      this.provider,
    )

    const addFilter = gatewayContract.filters.FinishAddMargin()

    const addEventsRaw = (
      await gatewayContract.queryFilter(addFilter, fromBlock, toBlock)
    ).filter((eventData) => eventData.args.pTokenId.toString() === tokenId)
    return await Promise.all(
      addEventsRaw.map(async (addEvent) => {
        let {
          blockNumber,
          args: { bToken, bAmount },
          transactionHash,
        } = addEvent

        // ETH address
        if (bToken === '0x0000000000000000000000000000000000000001') {
          bToken = getAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
        }
        const bTokenMetadata = await getTokenMetadata(
          bToken,
          this.chainId,
          this.provider,
        )

        return {
          transactionHash,
          protocolToken: {
            address: lToken,
            name: 'DPT',
            symbol: 'DPT',
            decimals: 18,
            tokenId,
          },
          tokens: [
            {
              type: TokenType.Underlying,
              balanceRaw: bAmount,
              ...bTokenMetadata,
              transactionHash,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )
  }

  private async getPTokenWithdrawlMovements(
    gateway: string,
    lToken: string,
    fromBlock: number,
    toBlock: number,
    tokenId: string,
  ): Promise<MovementsByBlock[]> {
    const gatewayContract = GatewayImplementation__factory.connect(
      gateway,
      this.provider,
    )
    const removeFilter = gatewayContract.filters.FinishRemoveMargin()

    const addEventsRaw = (
      await gatewayContract.queryFilter(removeFilter, fromBlock, toBlock)
    ).filter((eventData) => eventData.args.pTokenId.toString() === tokenId)
    return await Promise.all(
      addEventsRaw.map(async (addEvent) => {
        let {
          blockNumber,
          args: { bToken, bAmount },
          transactionHash,
        } = addEvent

        // ETH address
        if (bToken === '0x0000000000000000000000000000000000000001') {
          bToken = getAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
        }

        const bTokenMetadata = await getTokenMetadata(
          bToken,
          this.chainId,
          this.provider,
        )

        return {
          transactionHash,
          protocolToken: {
            address: lToken,
            name: 'DPT',
            symbol: 'DPT',
            decimals: 18,
            tokenId,
          },
          tokens: [
            {
              type: TokenType.Underlying,
              balanceRaw: bAmount,
              ...bTokenMetadata,
              transactionHash,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )
  }
}
