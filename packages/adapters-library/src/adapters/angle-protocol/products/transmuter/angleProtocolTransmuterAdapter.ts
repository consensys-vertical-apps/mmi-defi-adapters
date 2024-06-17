import { MaxUint256, getAddress } from 'ethers'
import { z } from 'zod'
import { WriteOnlyDeFiAdapter } from '../../../../core/adapters/writeOnlyAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  WriteActionInputSchemas,
  WriteActions,
} from '../../../../types/writeActions'
import { Protocol } from '../../../protocols'
import { GetTransactionParams } from '../../../supportedProtocols'
import { Transmuter__factory } from '../../contracts'

export class AngleProtocolTransmuterAdapter extends WriteOnlyDeFiAdapter {
  productId = 'transmuter'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'AngleProtocol',
      description: 'AngleProtocol defi adapter',
      siteUrl: 'https://angle.money',
      iconUrl:
        'https://raw.githubusercontent.com/AngleProtocol/angle-assets/main/02%20-%20Logos/02%20-%20Logo%20Only/angle-only-fill-blue.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'transmuter' })
  async buildMetadata() {
    const contractAddresses: Partial<Record<Chain, Record<string, string>>> = {
      [Chain.Ethereum]: {
        [getAddress('0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8')]: getAddress(
          '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
        ),
        [getAddress('0x0000206329b97DB379d5E1Bf586BbDB969C63274')]: getAddress(
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        ),
      },
      [Chain.Base]: {
        [getAddress('0x0000206329b97DB379d5E1Bf586BbDB969C63274')]: getAddress(
          '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        ),
      },
      [Chain.Arbitrum]: {
        [getAddress('0x0000206329b97DB379d5E1Bf586BbDB969C63274')]: getAddress(
          '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        ),
      },
      [Chain.Polygon]: {
        [getAddress('0x0000206329b97DB379d5E1Bf586BbDB969C63274')]: getAddress(
          '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        ),
      },
    }

    const chainAddresses = contractAddresses[this.chainId]
    if (!chainAddresses) {
      throw new Error('No contract addresses found for chain')
    }

    const result: Record<
      string,
      { protocolToken: Erc20Metadata; underlyingToken: Erc20Metadata[] }
    > = {}
    for (const contractAddress of Object.keys(chainAddresses)) {
      const underlyingToken = await getTokenMetadata(
        chainAddresses[contractAddress]!,
        this.chainId,
        this.provider,
      )
      const protocolToken = await getTokenMetadata(
        contractAddress,
        this.chainId,
        this.provider,
      )

      result[protocolToken.address] = {
        protocolToken,
        underlyingToken: [underlyingToken],
      }
    }
    return result
  }

  async getTransactionParams({
    action,
    inputs,
  }: Extract<
    GetTransactionParams,
    { protocolId: typeof Protocol.AngleProtocol; productId: 'transmuter' }
  >): Promise<{ to: string; data: string }> {
    const { asset } = inputs
    const tokens = await this.buildMetadata()
    const underlying = tokens[asset]!.underlyingToken[0]!.address
    if (!underlying) {
      throw new Error('Underlying token not found')
    }

    const transmuterAddresses: Partial<Record<Chain, Record<string, string>>> =
      {
        [Chain.Ethereum]: {
          [getAddress('0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8')]:
            getAddress('0x00253582b2a3FE112feEC532221d9708c64cEFAb'),
          [getAddress('0x0000206329b97DB379d5E1Bf586BbDB969C63274')]:
            getAddress('0x222222fD79264BBE280b4986F6FEfBC3524d0137'),
        },
        [Chain.Base]: {
          [getAddress('0x0000206329b97DB379d5E1Bf586BbDB969C63274')]:
            getAddress('0x222222880e079445Df703c0604706E71a538Fd4f'),
        },
        [Chain.Arbitrum]: {
          [getAddress('0x0000206329b97DB379d5E1Bf586BbDB969C63274')]:
            getAddress('0xD253b62108d1831aEd298Fc2434A5A8e4E418053'),
        },
        [Chain.Polygon]: {
          [getAddress('0x0000206329b97DB379d5E1Bf586BbDB969C63274')]:
            getAddress('0x1a652Fc6768C711111dde32384F7cb98dB3dd472'),
        },
      }

    const transmuter =
      transmuterAddresses[this.chainId as Chain]![asset as string]!
    const transmuterContract = Transmuter__factory.connect(
      transmuter,
      this.provider,
    )

    switch (action) {
      case WriteActions.Deposit: {
        const { amount, receiver } = inputs
        return transmuterContract.swapExactInput.populateTransaction(
          amount,
          1,
          underlying,
          asset,
          receiver,
          0,
        )
      }
      case WriteActions.Withdraw: {
        const { amount, receiver } = inputs
        return transmuterContract.swapExactOutput.populateTransaction(
          amount,
          MaxUint256,
          asset,
          underlying,
          receiver,
          0,
        )
      }
      default: {
        throw new NotImplementedError()
      }
    }
  }
}

export const WriteActionInputs = {
  [WriteActions.Deposit]: z.object({
    asset: z.string(),
    amount: z.string(),
    receiver: z.string(),
  }),
  [WriteActions.Withdraw]: z.object({
    asset: z.string(),
    amount: z.string(),
    receiver: z.string(),
  }),
} satisfies WriteActionInputSchemas
