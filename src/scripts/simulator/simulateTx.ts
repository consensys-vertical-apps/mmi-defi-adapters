import { spawn } from 'child_process'
import { JsonRpcProvider, TransactionRequest } from 'ethers'
import { Protocol } from '../../adapters/protocols'
import { Chain, ChainName } from '../../core/constants/chains'
import { DefiProvider } from '../../defiProvider'

export async function simulateTx({
  provider,
  chainId,
  blockNumber,
  input,
  protocolTokenAddress,
  protocolId,
  productId,
  tokenId,
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
}) {
  const providerUrl = provider._getConnection().url
  const disposeFork = await createFork(providerUrl, blockNumber)

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
    }

    const result = await testTransaction({
      forkedProvider: disposeFork.provider,
      tx: txReq,
    })

    console.log('Transaction minted')

    const chainName = ChainName[chainId]
    const forkDefiProvider = new DefiProvider({
      provider: {
        [chainName]: 'http://127.0.0.1:8545',
      },
    })

    const [deposits, withdrawals] = await Promise.all([
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
    ])

    if (!deposits.success || !withdrawals.success) {
      console.error('XXXX', {
        deposits,
        withdrawals,
      })
      throw new Error('Failed to fetch deposits and withdrawals')
    }

    deposits.movements.forEach((deposit) => {
      if (
        deposit.transactionHash === result.hash &&
        deposit.tokens &&
        deposit.tokens.length > 0
      ) {
        deposit.tokens?.forEach((token) => {
          console.log('Deposit', token)
        })
      }
    })

    withdrawals.movements.forEach((withdrawal) => {
      if (
        withdrawal.transactionHash === result.hash &&
        withdrawal.tokens &&
        withdrawal.tokens.length > 0
      ) {
        withdrawal.tokens?.forEach((token) => {
          console.log('Withdrawal', token)
        })
      }
    })
  } finally {
    disposeFork.dispose()
    console.log('Network fork has been disposed')
  }
}

async function createFork(providerUrl: string, blockNumber?: number) {
  return await new Promise<{
    provider: JsonRpcProvider
    dispose: () => void
  }>((resolve, reject) => {
    const command = 'anvil'
    const args = ['-a', '1', '--fork-url', providerUrl]

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
    anvilProcess.stdout.on('data', (data) => {
      if (data.includes('Listening on 127.0.0.1:8545')) {
        console.log('Network has been forked and is ready')
        clearTimeout(timeout)
        resolve({
          provider: new JsonRpcProvider('http://127.0.0.1:8545'),
          dispose,
        })
      }
    })

    // If there's an error, print it and reject the promise
    anvilProcess.stderr.on('data', (data) => {
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
