import fs from 'node:fs/promises'
import Bottleneck from 'bottleneck'
import { Command } from 'commander'
import PQueue from 'p-queue'
import { Chain, ChainName } from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'

type Limiter = <TaskResult>(
  task: () => Promise<TaskResult>,
) => Promise<TaskResult>

function getLimiter(
  concurrency: number,
  type: 'bottleneck' | 'p-queue',
): Limiter {
  if (type === 'bottleneck') {
    const limiter = new Bottleneck({ maxConcurrent: concurrency })

    return <TaskResult>(
      task: () => Promise<TaskResult>,
    ): Promise<TaskResult> => {
      return limiter.schedule(task)
    }
  }

  const limiter = new PQueue({ concurrency })

  return <TaskResult>(task: () => Promise<TaskResult>): Promise<TaskResult> => {
    return limiter.add(task)
  }
}

async function buildAddressLogs({
  addresses,
  limiterType,
  concurrency,
  printLogs,
}: {
  addresses: string[]
  limiterType: 'bottleneck' | 'p-queue'
  concurrency: number
  printLogs: boolean
}) {
  const limiter = getLimiter(concurrency, limiterType)
  const defiProvider = new DefiProvider({
    rpcGetLogsRetries: 1,
  })

  const results = await Promise.all(
    addresses.map((address, i) => {
      return limiter(async () => {
        if (printLogs) {
          console.log(`Logs for address ${i} // ${address}`)
        }

        const chainResults = await Promise.all(
          Object.values(Chain).map(async (chainId) => {
            const provider = defiProvider.chainProvider.providers[chainId]
            try {
              const result = await provider.getAllTransferLogsToAddress(address)
              return {
                chainId,
                result,
              }
            } catch (e) {
              if (
                e instanceof Error &&
                e.message.includes('query returned more than 10000 results')
              ) {
                return { chainId, error: '10k' }
              }

              if (
                e instanceof Error &&
                e.message.includes(
                  'This node provider does not support unlimited getLogs',
                )
              ) {
                return { chainId, error: 'no-support' }
              }

              return { chainId, error: e instanceof Error ? e.message : '?' }
            }
          }),
        )

        if (printLogs) {
          console.log(`Logs for address ${i} // ${address} // FINISHED`)
        }

        return {
          address,
          chainResults,
        }
      })
    }),
  )

  return (await Promise.all(results)).reduce(
    (acc, { address, chainResults }) => {
      acc[address] = chainResults.reduce(
        (acc, chainResult) => {
          if (chainResult.result) {
            acc.chainTransferContractAddresses[chainResult.chainId] =
              Array.from(
                new Set(chainResult.result.map((logEntry) => logEntry.address)),
              )
          } else {
            acc.errors[chainResult.chainId] = chainResult.error
          }

          return acc
        },
        {
          chainTransferContractAddresses: {},
          errors: {},
        } as {
          chainTransferContractAddresses: Partial<Record<Chain, string[]>>
          errors: Partial<Record<Chain, string>>
        },
      )

      return acc
    },
    {} as Record<
      string,
      {
        chainTransferContractAddresses: Partial<Record<Chain, string[]>>
        errors: Partial<Record<Chain, string>>
      }
    >,
  )
}

async function fetchAddresses(): Promise<string[]> {
  const tokenResponse = await fetch(`${process.env.AUTH_URL!}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.AUTH_CLIENT_ID!,
      client_secret: process.env.AUTH_CLIENT_SECRET!,
      audience: process.env.ADDRESSES_ENDPOINT_AUDIENCE!,
    }),
  })

  const { access_token } = (await tokenResponse.json()) as {
    access_token: string
  }

  const response = await fetch(process.env.ADDRESSES_ENDPOINT!, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })

  const data = (await response.json()) as {
    address: string
    namespace: string
  }[]

  return data
    .filter(({ namespace }) => namespace === 'eip155:1')
    .map(({ address }) => address)
}

export function localTestingCommands(
  program: Command,
  defiProvider: DefiProvider,
) {
  const logsFilePath = './transferLogs.json'
  program
    .command('build-log-file')
    .option('--pqueue', 'Use p-queue instead of bottleneck')
    .option(
      '--concurrency <concurrency>',
      'number of concurrent requests',
      (value) => Number(value),
      10,
    )
    .option(
      '--iterations <iterations>',
      'number of iterations',
      (value) => Number(value),
      -1,
    )
    .action(
      async ({
        pqueue,
        concurrency,
        iterations,
      }: { pqueue: boolean; concurrency: number; iterations: number }) => {
        const addresses = await fetchAddresses()

        const logs = await buildAddressLogs({
          addresses:
            iterations > 0 ? addresses.slice(0, iterations) : addresses,
          limiterType: pqueue ? 'p-queue' : 'bottleneck',
          concurrency,
          printLogs: true,
        })

        await fs.writeFile(logsFilePath, JSON.stringify(logs, undefined, 2))
      },
    )

  program
    .command('bulk-positions')
    .option('--pqueue', 'Use p-queue instead of bottleneck')
    .option('--mode <mode>', 'options: file, preload, live', 'live')
    .option(
      '--concurrency <concurrency>',
      'number of concurrent requests',
      (value) => Number(value),
      10,
    )
    .option(
      '--iterations <iterations>',
      'number of iterations',
      (value) => Number(value),
      -1,
    )
    .action(
      async ({
        pqueue,
        mode,
        concurrency,
        iterations,
      }: {
        pqueue: boolean
        mode: string
        concurrency: number
        iterations: number
      }) => {
        let prefetchedEventLogs:
          | Record<
              string,
              {
                chainTransferContractAddresses: Partial<Record<Chain, string[]>>
                errors: Partial<Record<Chain, string>>
              }
            >
          | undefined
        let addresses: string[]

        if (mode === 'file') {
          const parsedJson = JSON.parse(
            await fs.readFile(logsFilePath, 'utf-8'),
          ) as Record<
            string,
            {
              chainTransferContractAddresses: Partial<Record<Chain, string[]>>
              errors: Partial<Record<Chain, string>>
            }
          >
          prefetchedEventLogs = parsedJson
          addresses = Object.keys(parsedJson)
          addresses =
            iterations > 0 ? addresses.slice(0, iterations) : addresses
        } else if (mode === 'preload') {
          addresses = await fetchAddresses()
          addresses =
            iterations > 0 ? addresses.slice(0, iterations) : addresses
          prefetchedEventLogs = await buildAddressLogs({
            addresses,
            limiterType: pqueue ? 'p-queue' : 'bottleneck',
            concurrency,
            printLogs: true,
          })
        } else {
          addresses = await fetchAddresses()
          addresses =
            iterations > 0 ? addresses.slice(0, iterations) : addresses
        }

        console.log('ADDRESSES LOADED', addresses.length)

        const blockNumbers = await defiProvider.getStableBlockNumbers()

        console.log('STABLE BLOCKS LOADED', blockNumbers)

        const limiter = getLimiter(
          concurrency,
          pqueue ? 'p-queue' : 'bottleneck',
        )

        const posPromises = addresses.map((userAddress, i) => {
          return limiter(async () => {
            const startTime = Date.now()
            try {
              console.log(`Address ${i} // ${userAddress}`)

              const result = await defiProvider.getPositions({
                userAddress,
                blockNumbers,
                chainTransferContractAddresses:
                  prefetchedEventLogs?.[userAddress]
                    ?.chainTransferContractAddresses,
              })
              const endTime = Date.now()
              console.log(
                `Address ${i} // ${userAddress} FINISHED`,
                result.length,
              )

              return {
                userAddress,
                resultLength: result.length,
                startTime,
                endTime,
                timeTaken: endTime - startTime,
              }
            } catch (e) {
              console.log(`Address ${i} // ${userAddress} ERROR`, e)
              const endTime = Date.now()

              return {
                userAddress,
                resultLength: -1,
                startTime,
                endTime,
                timeTaken: endTime - startTime,
                error: e instanceof Error ? e.message : 'X',
              }
            }
          })
        })

        const results = await Promise.all(posPromises)
        for (const result of results) {
          if (result.error) {
            console.log('Error', result)
          } else if (result.timeTaken > 15000) {
            console.log('Slow result', result)
          } else {
            console.log('Result', result)
          }
        }
      },
    )

  program.command('address-10k').action(async () => {
    const addresses = await fetchAddresses()

    const eventLogs = await buildAddressLogs({
      addresses,
      limiterType: 'bottleneck',
      concurrency: 10,
      printLogs: false,
    })

    const over10Kresults = Object.entries(eventLogs).flatMap(
      ([address, { errors }]) => {
        return Object.entries(errors)
          .filter(([_, error]) => error === '10k')
          .map(([chainId, _]) => ({
            chainId: Number(chainId) as Chain,
            address,
          }))
      },
    )

    console.log(
      'Addresses with over 10k logs',
      Array.from(new Set(over10Kresults.map((x) => x.address))),
    )

    console.log('Totals per chain')
    Object.values(Chain).forEach((chainId) => {
      console.log(
        `${ChainName[chainId]}: ${
          over10Kresults.filter((x) => x.chainId === chainId).length
        }`,
      )
    })
  })
}
