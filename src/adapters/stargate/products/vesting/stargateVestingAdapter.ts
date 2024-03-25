import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { ResolveUnderlyingPositions } from '../../../../core/decorators/resolveUnderlyingPositions'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  GetPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  AssetType,
  ProtocolTokenUnderlyingRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { StargateVotingEscrow__factory } from '../../contracts'

type StargateVestingMetadata = {
  contractToken: Erc20Metadata
  underlyingToken: Erc20Metadata
}

export class StargateVestingAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'vesting'
  protocolId: Protocol
  chainId: Chain

  adaptersController: AdaptersController

  private provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Stargate',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [(await this.buildMetadata()).contractToken]
  }

  @ResolveUnderlyingPositions
  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { contractToken, underlyingToken } = await this.buildMetadata()

    if (
      protocolTokenAddresses &&
      !protocolTokenAddresses.includes(contractToken.address)
    ) {
      return []
    }

    const votingEscrowContract = StargateVotingEscrow__factory.connect(
      contractToken.address,
      this.provider,
    )

    const [{ amount: lockedAmount }, userBalance] = await Promise.all([
      votingEscrowContract.locked(userAddress, {
        blockTag: blockNumber,
      }),
      votingEscrowContract.balanceOf(userAddress, {
        blockTag: blockNumber,
      }),
    ])

    if (!userBalance && !lockedAmount) {
      return []
    }

    const tokens = [
      {
        ...contractToken,
        type: TokenType.Protocol,
        balanceRaw: userBalance,
        tokens: [
          {
            ...underlyingToken,
            type: TokenType.Underlying,
            balanceRaw: lockedAmount,
          },
        ],
      },
    ]

    return tokens
  }

  async getProtocolTokenToUnderlyingTokenRate(): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  @CacheToFile({ fileKey: 'vesting-token' })
  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]: getAddress(
        '0x0e42acBD23FAee03249DAFF896b78d7e79fBD58E',
      ),
      [Chain.Arbitrum]: getAddress(
        '0xfBd849E6007f9BC3CC2D6Eb159c045B8dc660268',
      ),
    }

    const votingEscrowContract = StargateVotingEscrow__factory.connect(
      contractAddresses[this.chainId]!,
      this.provider,
    )

    const underlyingTokenAddress = await votingEscrowContract.token()

    const contractToken = await getTokenMetadata(
      contractAddresses[this.chainId]!,
      this.chainId,
      this.provider,
    )
    const underlyingToken = await getTokenMetadata(
      underlyingTokenAddress,
      this.chainId,
      this.provider,
    )

    const metadataObject: StargateVestingMetadata = {
      contractToken,
      underlyingToken,
    }

    return metadataObject
  }
}
