import { Erc20__factory } from '../../contracts'
import { TransferEvent } from '../../contracts/Erc20'
import { MovementsByBlock, TokenType } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { MaxMovementLimitExceededError } from '../errors/errors'
import { CustomJsonRpcProvider } from '../provider/CustomJsonRpcProvider'

export async function getErc20Movements({
  erc20Token,
  protocolToken,
  filter: { fromBlock, toBlock, from, to },
  provider,
}: {
  erc20Token: Erc20Metadata
  protocolToken: Erc20Metadata & { tokenId?: string }
  filter: {
    fromBlock: number
    toBlock: number
    from?: string
    to?: string
  }
  provider: CustomJsonRpcProvider
}): Promise<MovementsByBlock[]> {
  const protocolTokenContract = Erc20__factory.connect(
    erc20Token.address,
    provider,
  )

  const filter = protocolTokenContract.filters.Transfer(from, to)

  const eventResults =
    await protocolTokenContract.queryFilter<TransferEvent.Event>(
      filter,
      fromBlock,
      toBlock,
    )

  // Temp fix to avoid timeouts
  // Remember these are on per pool basis.
  // We should monitor number
  // 20 interactions with same pool feels a healthy limit
  if (eventResults.length > 20) {
    throw new MaxMovementLimitExceededError()
  }

  return await Promise.all(
    eventResults.map(async (transferEvent) => {
      const {
        blockNumber,
        args: { value: protocolTokenMovementValueRaw },
        transactionHash,
      } = transferEvent

      return {
        transactionHash,
        protocolToken: {
          address: protocolToken.address,
          symbol: protocolToken.symbol,
          name: protocolToken.name,
          decimals: protocolToken.decimals,
          tokenId: protocolToken.tokenId,
        },
        tokens: [
          {
            address: erc20Token.address,
            symbol: erc20Token.symbol,
            name: erc20Token.name,
            decimals: erc20Token.decimals,
            balanceRaw: protocolTokenMovementValueRaw,
            type: TokenType.Underlying,
            blockNumber,
          },
        ],
        blockNumber,
      }
    }),
  )
}
