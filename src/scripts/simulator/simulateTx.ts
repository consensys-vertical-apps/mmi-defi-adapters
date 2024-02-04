import { spawn } from 'child_process'
import { JsonRpcProvider, TransactionRequest } from 'ethers'

export async function simulateTx({
  provider,
  blockNumber,
  input,
}: {
  provider: JsonRpcProvider
  blockNumber?: number
  input:
    | string
    | (TransactionRequest & { from: string; to: string; data: string })
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
    console.log(result)
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
        console.log('STDOUT TYPE', typeof data)
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

  return {
    originalTx: tx,
    receipt,
    logs: receipt.logs.map((log) => log.topics),
  }
}
