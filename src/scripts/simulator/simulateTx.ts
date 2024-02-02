import { spawn } from 'child_process'
import { JsonRpcProvider } from 'ethers'

export async function simulateTx({
  provider,
  blockNumber,
  input,
}: {
  provider: JsonRpcProvider
  blockNumber?: number
  input: string
}) {
  const providerUrl = provider._getConnection().url
  const disposeFork = await createFork(providerUrl, blockNumber)

  try {
    const result = await replicateTx({
      provider,
      forkedProvider: disposeFork.provider,
      txHash: input,
    })
    console.log(result)
  } finally {
    disposeFork.dispose()
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

    const timeout = setTimeout(() => {
      console.error('Failed to fork the network with anvil')
      console.error('Timeout')
      reject()
    }, 10000)

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

    anvilProcess.stderr.on('data', (data) => {
      console.error('Failed to fork the network with anvil')
      console.error(`stderr: ${data}`)
      clearTimeout(timeout)
      reject()
    })
  })
}

async function replicateTx({
  provider,
  forkedProvider,
  txHash,
}: {
  provider: JsonRpcProvider
  forkedProvider: JsonRpcProvider
  txHash: string
}) {
  const tx = await provider.getTransaction(txHash)

  if (!tx) {
    throw new Error('Transaction not found')
  }

  await forkedProvider.send('anvil_impersonateAccount', [tx.from])
  const newSigner = await forkedProvider.getSigner(tx.from)

  const newTx = await newSigner.sendTransaction({
    to: tx.to,
    data: tx.data,
    value: tx.value,
    gasLimit: tx.gasLimit,
    maxFeePerGas: tx.maxFeePerGas,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    chainId: tx.chainId,
    type: tx.type,
    accessList: tx.accessList,
  })

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
