import { spawn } from 'node:child_process'
import { JsonRpcProvider, TransactionRequest, ethers } from 'ethers'
import { Protocol } from '../../adapters/protocols'
import { Erc20__factory } from '../../contracts'
import { Chain, ChainIdToChainNameMap } from '../../core/constants/chains'
import { bigintJsonStringify } from '../../core/utils/bigintJson'
import { DefiProvider } from '../../defiProvider'
import {
  DefiMovementsResponse,
  DisplayMovementsByBlock,
} from '../../types/response'

export async function simulateTx({
  provider,
  chainId,
  blockNumber,
  input,
  protocolTokenAddress,
  protocolId,
  productId,
  tokenId,
  asset,
}: {
  provider: JsonRpcProvider
  chainId: Chain
  blockNumber?: number
  input:
    | string
    | (TransactionRequest & { from: string; to: string; data: string })
  protocolTokenAddress: string
  protocolId: Protocol
  productId: string
  tokenId?: string
  asset?: string
}) {
  console.log('\nStarting forked simulation of transaction parameters')
  const providerUrl = provider._getConnection().url
  const forkDetails = await createFork(providerUrl, blockNumber)

  try {
    let txReq: TransactionRequest & { from: string }

    if (typeof input === 'string') {
      const tx = await provider.getTransaction(input)

      if (!tx) {
        throw new Error('Transaction not found')
      }

      txReq = {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        gasLimit: tx.gasLimit,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        chainId: tx.chainId,
        type: tx.type,
        accessList: tx.accessList,
      }
    } else {
      txReq = input

      if (asset) {
        const erc20TokenContract = Erc20__factory.connect(
          asset!,
          forkDetails.provider,
        )

        const approveTx = await erc20TokenContract.approve.populateTransaction(
          input.to,
          ethers.MaxUint256,
        )

        console.log('Submitting transaction to approve tokens')
        await testTransaction({
          forkedProvider: forkDetails.provider,
          tx: {
            from: input.from,
            to: approveTx.to,
            data: approveTx.data,
          },
        })
        console.log('Transaction to approve tokens mined')
      }
    }

    console.log('Submitting transaction')
    const result = await testTransaction({
      forkedProvider: forkDetails.provider,
      tx: txReq,
    })
    console.log('Transaction mined')

    const chainName = ChainIdToChainNameMap[chainId]
    const forkDefiProvider = new DefiProvider({
      provider: {
        [chainName]: forkDetails.providerUrl,
      },
      rpcGetLogsTimeoutInMs: 240000,
    })

    const [deposits, withdrawals, positions] = await Promise.all([
      forkDefiProvider.getDeposits({
        userAddress: result.from,
        fromBlock: result.blockNumber,
        toBlock: result.blockNumber,
        chainId,
        protocolTokenAddress,
        protocolId,
        productId,
        tokenId,
      }),
      forkDefiProvider.getWithdrawals({
        userAddress: result.from,
        fromBlock: result.blockNumber,
        toBlock: result.blockNumber,
        chainId,
        protocolTokenAddress,
        protocolId,
        productId,
        tokenId,
      }),
      forkDefiProvider.getPositions({
        userAddress: result.from,
        filterProtocolIds: [protocolId],
        filterChainIds: [chainId],
        filterProtocolTokens: [protocolTokenAddress],
        blockNumbers: {
          [Chain.Ethereum]: result.blockNumber,
        },
      }),
    ])

    processMovements('deposits', deposits, result.hash)
    processMovements('withdrawals', withdrawals, result.hash)

    const productPositions = positions.filter(
      (position) => position.success && position.productId === productId,
    )

    console.log('\nPrinting positions for that protocol token and product')
    console.log(bigintJsonStringify(productPositions, 2))
  } finally {
    forkDetails.dispose()
    console.log('Network fork has been disposed')
  }
}

async function createFork(providerUrl: string, blockNumber?: number) {
  return await new Promise<{
    providerUrl: string
    provider: JsonRpcProvider
    dispose: () => void
  }>((resolve, reject) => {
    const command = 'anvil'
    const args = ['-a', '1', '--fork-url', providerUrl, '--gas-price', '0']

    if (blockNumber) {
      args.push('--fork-block-number', blockNumber.toString())
    }

    const anvilProcess = spawn(command, args)

    const dispose = () => anvilProcess.kill('SIGTERM')

    // This timeout is used to prevent the promise from hanging indefinitely
    const timeout = setTimeout(() => {
      console.error('Failed to fork the network with anvil')
      console.error('Timeout')
      dispose()
      reject()
    }, 10000)

    // Checks for the message that indicates the fork is ready
    anvilProcess.stdout.on('data', (data: Buffer) => {
      const match = data
        .toString()
        .match(/Listening on (\d+\.\d+\.\d+\.\d+:\d+)/)
      if (match && match.length === 2) {
        const providerUrl = `http://${match[1]!}`
        console.log(`Network has been forked and is ready at ${providerUrl}`)
        clearTimeout(timeout)
        resolve({
          providerUrl,
          provider: new JsonRpcProvider(providerUrl),
          dispose,
        })
      }
    })

    // If there's an error, print it and reject the promise
    anvilProcess.stderr.on('data', (data: Buffer) => {
      console.error('Failed to fork the network with anvil')
      console.error(`stderr: ${data}`)
      clearTimeout(timeout)
      reject()
    })
  })
}

async function testTransaction({
  forkedProvider,
  tx,
}: {
  forkedProvider: JsonRpcProvider
  tx: TransactionRequest & { from: string }
}) {
  await forkedProvider.send('anvil_impersonateAccount', [tx.from])
  const newSigner = await forkedProvider.getSigner(tx.from)

  const newTx = await newSigner.sendTransaction(tx)

  const receipt = await newTx.wait()

  if (!receipt) {
    throw new Error('Transaction not mined')
  }

  return receipt
}

function processMovements(
  movementType: 'deposits' | 'withdrawals',
  movementsResponse: DefiMovementsResponse,
  txHash: string,
) {
  if (!movementsResponse.success) {
    console.error(`\nFailed to fetch ${movementType}`, {
      movementsResponse,
    })

    return
  }

  const extractMovements = (movements: DisplayMovementsByBlock[]) => {
    return movements.flatMap((movement) => {
      if (
        movement.transactionHash === txHash &&
        movement.tokens &&
        movement.tokens.length > 0
      ) {
        return movement.tokens
      }

      return []
    })
  }

  const tokenMovements = extractMovements(movementsResponse.movements)

  if (tokenMovements.length > 0) {
    console.log(`\nPrinting ${movementType} for transaction ${txHash}`)
    tokenMovements.forEach((token) => {
      console.log(bigintJsonStringify(token, 2))
    })
  }
}
