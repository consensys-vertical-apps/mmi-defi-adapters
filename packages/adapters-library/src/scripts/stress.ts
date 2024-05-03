import { Command } from 'commander'
import { ethers } from 'ethers'
import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import { TimePeriod } from '../core/constants/timePeriod'
import { DefiProvider } from '../defiProvider'
import {
  AdapterResponse,
  DefiPositionResponse,
  DefiProfitsResponse,
} from '../types/response'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'

export function stressCommand(program: Command, defiProvider: DefiProvider) {
  program
    .command('stress')
    .option(
      '-i, --iterations <iterations>',
      'number of times that the test will be executed',
      '1',
    )
    .option('-a, --address <address>', 'address of the target account')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )

    .option(
      '-s, --strategy <strategy>',
      'strategy to use (e.g. sequential-naive, sequential-optimized, parallel-naive, optimized)',
      'optimized',
    )
    .showHelpAfterError()
    .action(async ({ iterations, address, protocols, chains, strategy }) => {
      const addresses = [...Array(Number(iterations)).keys()].map(() => {
        return address ?? ethers.Wallet.createRandom().address
      })

      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterChainIds = multiChainFilter(chains)

      console.log('Run stress test')
      console.log(`Iterations: ${addresses.length}`)
      if (filterChainIds) {
        console.log(`Chains: ${filterChainIds.join(',')}`)
      }
      if (filterProtocolIds) {
        console.log(`Protocols: ${filterProtocolIds.join(',')}`)
      }

      const blockNumbers =
        await defiProvider.getStableBlockNumbers(filterChainIds)

      const start = Date.now()

      const strategyInput: StrategyInput = {
        defiProvider,
        addresses,
        filterChainIds,
        filterProtocolIds,
        blockNumbers,
        globalStart: start,
      }

      switch (strategy) {
        case 'sequential-naive':
          await sequential({
            ...strategyInput,
            filterProtocolTokens: false,
          })
          break
        case 'sequential-optimized':
          await sequential({
            ...strategyInput,
            filterProtocolTokens: true,
          })
          break
        case 'parallel-naive':
          await parallelNaive(strategyInput)
          break
        case 'optimized':
          await optimized(strategyInput)
          break
        default:
          throw new Error(`Invalid strategy: ${strategy}`)
      }

      const end = Date.now()
      console.log(`Total: ${end - start}ms`)
    })
}

type StrategyInput = {
  addresses: string[]
  defiProvider: DefiProvider
  filterChainIds: Chain[] | undefined
  filterProtocolIds: Protocol[] | undefined
  blockNumbers: Partial<Record<Chain, number>>
  globalStart: number
}

/**
 * Runs all calls (positions and 3xprofits) and addresses in parallel, without protocol token filtering
 */
async function parallelNaive({ addresses, ...input }: StrategyInput) {
  const promises = addresses.flatMap((userAddress) => {
    return [
      profileCall({
        ...input,
        method: 'positions',
        userAddress,
      }),
      profileCall({
        ...input,
        method: 'profits',
        timePeriod: TimePeriod.oneDay,
        userAddress,
      }),
      profileCall({
        ...input,
        method: 'profits',
        timePeriod: TimePeriod.sevenDays,
        userAddress,
      }),
      profileCall({
        ...input,
        method: 'profits',
        timePeriod: TimePeriod.thirtyDays,
        userAddress,
      }),
    ]
  })

  await Promise.all(promises)
}

/**
 * Runs all calls (positions and 3xprofits) and addresses sequentially, with optional protocol token filtering
 */
async function sequential({
  addresses,
  filterProtocolTokens,
  ...input
}: StrategyInput & { filterProtocolTokens: boolean }) {
  for (const userAddress of addresses) {
    const positionsResponses = await profileCall({
      ...input,
      method: 'positions',
      userAddress,
    })

    await profileCall({
      ...input,
      method: 'profits',
      timePeriod: TimePeriod.oneDay,
      userAddress,
      protocolTokenAddresses: filterProtocolTokens
        ? filterProtocolTokensWithResponse(positionsResponses)
        : undefined,
    })

    await profileCall({
      ...input,
      method: 'profits',
      timePeriod: TimePeriod.sevenDays,
      userAddress,
      protocolTokenAddresses: filterProtocolTokens
        ? filterProtocolTokensWithResponse(positionsResponses)
        : undefined,
    })

    await profileCall({
      ...input,
      method: 'profits',
      timePeriod: TimePeriod.thirtyDays,
      userAddress,
      protocolTokenAddresses: filterProtocolTokens
        ? filterProtocolTokensWithResponse(positionsResponses)
        : undefined,
    })
  }
}

/**
 * Runs all position calls for all addresses in parallel, then runs all profits calls for all addresses in parallel with protocol token filtering
 */
async function optimized({ addresses, ...input }: StrategyInput) {
  const promises = addresses.map(async (userAddress) => {
    const positionsResponses = await profileCall({
      ...input,
      method: 'positions',
      userAddress,
    })

    const protocolTokenAddresses =
      filterProtocolTokensWithResponse(positionsResponses)

    const profitPromises = [
      profileCall({
        ...input,
        method: 'profits',
        timePeriod: TimePeriod.oneDay,
        userAddress,
        protocolTokenAddresses,
      }),
      profileCall({
        ...input,
        method: 'profits',
        timePeriod: TimePeriod.sevenDays,
        userAddress,
        protocolTokenAddresses,
      }),
      profileCall({
        ...input,
        method: 'profits',
        timePeriod: TimePeriod.thirtyDays,
        userAddress,
        protocolTokenAddresses,
      }),
    ]

    await Promise.all(profitPromises)
  })

  await Promise.all(promises)
}

type ProfileCallInput = {
  defiProvider: DefiProvider
  userAddress: string
  filterChainIds: Chain[] | undefined
  filterProtocolIds: Protocol[] | undefined
  blockNumbers: Partial<Record<Chain, number>>
  globalStart: number
  protocolTokenAddresses?: string[]
} & ({ method: 'positions' } | { method: 'profits'; timePeriod: TimePeriod })

async function profileCall(
  input: ProfileCallInput & { method: 'positions' },
): Promise<DefiPositionResponse[]>
async function profileCall(
  input: ProfileCallInput & { method: 'profits' },
): Promise<DefiProfitsResponse[]>
async function profileCall(
  input: ProfileCallInput,
): Promise<DefiPositionResponse[] | DefiProfitsResponse[]> {
  const {
    defiProvider,
    method,
    userAddress,
    filterChainIds,
    filterProtocolIds,
    blockNumbers,
    globalStart,
    protocolTokenAddresses,
  } = input

  const logPrefix = `[${
    method === 'profits' ? `profits:${input.timePeriod}` : 'positions'
  } # ${userAddress}]`

  const start = Date.now()
  console.log(`${logPrefix} Start: ${start - globalStart}ms`)

  const result = await (method === 'profits'
    ? defiProvider.getProfits({
        userAddress,
        timePeriod: input.timePeriod,
        filterChainIds,
        filterProtocolIds,
        toBlockNumbersOverride: blockNumbers,
        filterProtocolTokens: protocolTokenAddresses,
      })
    : defiProvider.getPositions({
        userAddress,
        filterChainIds,
        filterProtocolIds,
        blockNumbers,
        filterProtocolTokens: protocolTokenAddresses,
      }))

  const end = Date.now()

  console.log(
    `${logPrefix} Total: ${end - start}ms - Tokens: ${returnedValues(result)}}`,
  )

  return result
}

function returnedValues(
  result: AdapterResponse<{
    tokens: unknown[]
  }>[],
) {
  return result.reduce((accumulator, response) => {
    if (!response.success) {
      return accumulator
    }

    return response.tokens.length + accumulator
  }, 0)
}

function filterProtocolTokensWithResponse(
  positionsResponses: DefiPositionResponse[],
) {
  return positionsResponses.flatMap((positions) => {
    if (!positions.success) {
      return []
    }

    return positions.tokens.map((token) => token.address)
  })
}
