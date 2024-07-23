import fs from 'node:fs/promises'
import Bottleneck from 'bottleneck'
import { Command } from 'commander'
import PQueue from 'p-queue'
import { Chain, ChainName } from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'

type Limiter = <TaskResult>(
  task: () => Promise<TaskResult>,
) => Promise<TaskResult>

export function getLimiter(
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

export async function buildAddressLogs({
  addresses,
  limiterType,
  printLogs,
}: {
  addresses: string[]
  limiterType: 'bottleneck' | 'p-queue'
  printLogs: boolean
}) {
  const limiter = getLimiter(30, limiterType)
  const defiProvider = new DefiProvider()

  const resultPromises = addresses.map((address, i) => {
    return limiter(async () => {
      if (printLogs) {
        console.log(`Logs for address ${i} // ${address}`)
      }

      const allResults = Object.values(Chain).map(async (chainId) => {
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
      })

      const settledResults = await Promise.all(allResults)
      if (printLogs) {
        console.log(`Logs for address ${i} // ${address} // FINISHED`)
      }

      return {
        userAddress: address,
        logs: settledResults.reduce(
          (acc, current) => {
            if (current.result) {
              acc[current.chainId] = Array.from(
                new Set(current.result.map((x) => x.address)),
              )
            }

            return acc
          },
          {} as Partial<Record<Chain, string[]>>,
        ),
        errors: settledResults.reduce(
          (acc, x) => {
            if (x.error) {
              acc[x.chainId] = x.error
            }

            return acc
          },
          {} as Partial<Record<Chain, string>>,
        ),
      }
    })
  })

  return (await Promise.all(resultPromises)).reduce(
    (acc, current) => {
      acc[current.userAddress] = {
        chainTransferContractAddresses: current.logs,
        errors: current.errors,
      }

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

export async function fetchAddresses(): Promise<string[]> {
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

export function localTestingCommands(program: Command, defiProvider: DefiProvider) {
  const logsFilePath = './transferLogs.json'
  program
    .command('log-file')
    .option('--pqueue', 'Use p-queue instead of bottleneck')
    .action(async ({ pqueue }: { pqueue: boolean }) => {
      const addresses = await fetchAddresses()

      const logs = await buildAddressLogs({
        addresses,
        limiterType: pqueue ? 'p-queue' : 'bottleneck',
        printLogs: true,
      })

      await fs.writeFile(logsFilePath, JSON.stringify(logs, undefined, 2))
    })

  program
    .command('test-log-file')
    .option('--pqueue', 'Use p-queue instead of bottleneck')
    .option('--mode <mode>', 'options: file, preload, live', 'live')
    .action(async ({ pqueue, mode }: { pqueue: boolean; mode: string }) => {
      let prefetchedEventLogs: Record<
        string,
        {
          chainTransferContractAddresses: Partial<Record<Chain, string[]>>
          errors: Partial<Record<Chain, string>>
        }
      >
      let addresses: string[]

      if (mode === 'file') {
        prefetchedEventLogs = JSON.parse(
          await fs.readFile(logsFilePath, 'utf-8'),
        )
        addresses = Object.keys(prefetchedEventLogs)
      } else if (mode === 'preload') {
        addresses = await fetchAddresses()
        prefetchedEventLogs = await buildAddressLogs({
          addresses,
          limiterType: pqueue ? 'p-queue' : 'bottleneck',
          printLogs: true,
        })
      } else {
        addresses = await fetchAddresses()
      }

      console.log('FETCH STABLE BLOCK NUMBERS')

      const blockNumbers = await defiProvider.getStableBlockNumbers()

      console.log('START FETCHING POSITIONS', blockNumbers)

      const limiter = getLimiter(5, pqueue ? 'p-queue' : 'bottleneck')

      const posPromises = addresses.slice(0, 100).map((userAddress, i) => {
        return limiter(async () => {
          const startTime = Date.now()
          try {
            // if (!logs[Chain.Arbitrum] || logs[Chain.Arbitrum]!.length === 0) {
            //   const endTime = Date.now()

            //   return {
            //     userAddress,
            //     resultLength: 0,
            //     startTime,
            //     endTime,
            //     timeTaken: endTime - startTime,
            //     error: 'NOTHING',
            //   }
            // }
            console.log(`Address ${i} // ${userAddress}`)

            const result = await defiProvider.getPositions({
              userAddress,
              blockNumbers,
              filterChainIds: Object.values(Chain).filter(
                (x) => x === Chain.Arbitrum,
              ),
              chainTransferContractAddresses:
                prefetchedEventLogs[userAddress]
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
        } else if (result.timeTaken > 20000) {
          console.log('Slow result', result)
        } else {
          console.log('Result', result)
        }
      }
    })

  program
    .command('test-limiter')
    .option('--pqueue', 'Use p-queue instead of bottleneck')
    .option(
      '--concurrency <concurrency>',
      'number of concurrent requests',
      (value) => Number(value),
      50,
    )
    .option(
      '--iterations <iterations>',
      'number of iterations',
      (value) => Number(value),
      500,
    )
    .action(
      async ({
        pqueue,
        concurrency,
        iterations,
      }: { pqueue: boolean; concurrency: number; iterations: number }) => {
        const limiter = getLimiter(
          Number(concurrency),
          pqueue ? 'p-queue' : 'bottleneck',
        )

        await Promise.all(
          Array.from({ length: iterations }, (_, index) => index).map((i) => {
            return limiter(async () => {
              const startTime = Date.now()
              console.log(`Index ${i}`)
              await new Promise((resolve) =>
                setTimeout(
                  resolve,
                  Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000,
                ),
              )
              const endTime = Date.now()
              console.log(`Index ${i} // FINISHED ${endTime - startTime}`)
            })
          }),
        )
      },
    )

  program.command('address-10k').action(async () => {
    const addresses = await fetchAddresses()

    const eventLogs = await buildAddressLogs({
      addresses,
      limiterType: 'bottleneck',
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
