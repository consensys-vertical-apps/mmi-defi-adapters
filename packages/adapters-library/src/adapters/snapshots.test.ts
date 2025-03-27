import assert from 'node:assert'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Chain, ChainName } from '../core/constants/chains'
import { AdapterMissingError } from '../core/errors/errors'
import { getInvalidAddresses } from '../core/utils/address-validation'
import { bigintJsonParse } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { protocolFilter } from '../core/utils/input-filters'
import { logger } from '../core/utils/logger'
import { DefiProvider } from '../defiProvider'
import { RpcInterceptedResponses, startRpcMock } from '../tests/rpcInterceptor'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import { TestCase } from '../types/testCase'
import { Protocol } from './protocols'
import { supportedProtocols } from './supportedProtocols'

const TEST_TIMEOUT = 300000

const defiProvider = new DefiProvider({
  config: {
    useMulticallInterceptor: false,
  },
})
const defiProviderWithMulticall = new DefiProvider({
  config: {
    useMulticallInterceptor: true,
  },
})

const filterProtocolId = protocolFilter(
  process.env.DEFI_ADAPTERS_TEST_FILTER_PROTOCOL,
)

const filterProductId = process.env.DEFI_ADAPTERS_TEST_FILTER_PRODUCT

// @ts-ignore
const normalizeNegativeZero = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'number' && Object.is(obj[key], -0)) {
      obj[key] = Math.abs(obj[key])
    } else if (obj[key] && typeof obj[key] === 'object') {
      normalizeNegativeZero(obj[key])
    }
  })
  return obj
}

const allTestCases = await (async () => {
  const support = await defiProvider.getSupport({
    filterProtocolIds: filterProtocolId ? [filterProtocolId] : undefined,
    includeProtocolTokens: false,
  })

  return await Object.values(support).reduce(
    async (acc, adapters) => {
      ;(await acc)[adapters[0].protocolDetails.protocolId] =
        await adapters.reduce(
          async (acc, adapter) => {
            if (
              filterProductId &&
              adapter.protocolDetails.productId !== filterProductId
            ) {
              return acc
            }
            ;(await acc)[adapter.protocolDetails.productId] = (
              await import(
                `./${adapter.protocolDetails.protocolId}/products/${adapter.protocolDetails.productId}/tests/testCases`
              )
            ).testCases

            return acc
          },
          {} as Promise<Record<string, TestCase[]>>,
        )

      return acc
    },
    {} as Promise<Record<Protocol, Record<string, TestCase[]>>>,
  )
})()

Object.entries(allTestCases).forEach(([protocolId, protocolTestCases]) => {
  Object.entries(protocolTestCases).forEach(([productId, productTestCases]) => {
    describe(protocolId, () => {
      runProductTests(protocolId as Protocol, productId, productTestCases)
    })
  })
})

function runProductTests(
  protocolId: Protocol,
  productId: string,
  testCases: TestCase[],
) {
  describe(productId, () => {
    let rpcMockStop: (() => void) | undefined

    beforeAll(async () => {
      const allMocks = (
        await Promise.all(
          testCases.map(async (testCase) => {
            const { rpcResponses } = await loadJsonFile(
              testCase,
              protocolId,
              productId,
            )

            if (!rpcResponses) {
              return []
            }

            return Object.entries(rpcResponses).map(([key, responses]) => ({
              key,
              responses,
            }))
          }),
        )
      )
        .flat()
        .reduce((acc, x) => {
          acc[x.key] = x.responses
          return acc
        }, {} as RpcInterceptedResponses)

      const chainUrls = Object.values(defiProvider.chainProvider.providers).map(
        (rpcProvider) => rpcProvider._getConnection().url,
      )

      if (Object.keys(allMocks).length > 0) {
        const { stop } = startRpcMock(allMocks, chainUrls)
        rpcMockStop = stop
      }
    })

    afterAll(() => {
      rpcMockStop?.()
    })

    const protocolChains = Object.keys(supportedProtocols[protocolId]).map(
      (chainIdKey) => Number(chainIdKey),
    ) as Chain[]

    for (const chainId of protocolChains) {
      let adapter: IProtocolAdapter

      try {
        adapter = defiProvider.adaptersController.fetchAdapter(
          chainId,
          protocolId,
          productId,
        )
      } catch (error) {
        if (error instanceof AdapterMissingError) {
          continue
        }

        throw error
      }

      it(`protocol token addresses are checksumed (${protocolId} # ${productId} # ${ChainName[chainId]})`, async () => {
        let protocolTokenAddresses: string[]
        try {
          protocolTokenAddresses = (await adapter.getProtocolTokens()).map(
            (x) => x.address,
          )
        } catch (error) {
          // Skip if adapter does not have protocol tokens
          expect(true).toBeTruthy()
          return
        }

        const invalidAddresses = getInvalidAddresses(protocolTokenAddresses)

        if (invalidAddresses.length > 0) {
          throw new Error(
            `Invalid protocol token addresses found:\n${invalidAddresses.join(
              '\n',
            )}`,
          )
        }

        expect(true).toBeTruthy()
      })
    }

    const positionsTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'positions' } =>
        testCase.method === 'positions',
    )
    if (positionsTestCases.length) {
      describe('getPositions', () => {
        it.each(
          positionsTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'positions for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.getPositions({
              ...testCase.input,
              filterProtocolIds: [protocolId],
              filterProductIds: [productId],
              filterChainIds: [testCase.chainId],
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)

            for (const positions of response) {
              expect(positions.success).toBe(true)
              assert(positions.success)

              for (const position of positions.tokens) {
                expect(position.tokens).toBeDefined()
              }
            }
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(
            `[Integration test] getPositions for ${protocolId} finished`,
          )
        })
      })
    }

    const pricesTestCases = testCases.filter(
      (testCase): testCase is TestCase & { method: 'prices' } =>
        testCase.method === 'prices',
    )
    if (pricesTestCases.length) {
      describe('unwrap', () => {
        it.each(
          pricesTestCases.map((testCase) => [testKey(testCase), testCase]),
        )(
          'unwrap for test %s match',
          async (_, testCase) => {
            const { snapshot, blockNumber, defiProvider } = await fetchSnapshot(
              testCase,
              protocolId,
              productId,
            )

            const response = await defiProvider.unwrap({
              filterProtocolIds: [protocolId],
              filterProductIds: [productId],
              filterChainIds: [testCase.chainId],
              filterProtocolToken: testCase.filterProtocolToken,
              blockNumbers: { [testCase.chainId]: blockNumber },
            })

            expect(response).toEqual(snapshot)
          },
          TEST_TIMEOUT,
        )

        afterAll(() => {
          logger.debug(`[Integration test] unwrap for ${protocolId} finished`)
        })
      })
    }
  })
}

function testKey({ chainId, method, key }: TestCase) {
  return `${ChainName[chainId]}.${method}${key ? `.${kebabCase(key)}` : ''}`
}

async function fetchSnapshot(
  testCase: TestCase,
  protocolId: Protocol,
  productId: string,
) {
  const { snapshot, blockNumber, rpcResponses } = await loadJsonFile(
    testCase,
    protocolId,
    productId,
  )

  return {
    snapshot,
    blockNumber,
    defiProvider: rpcResponses ? defiProvider : defiProviderWithMulticall,
  }
}

async function loadJsonFile(
  testCase: TestCase,
  protocolId: Protocol,
  productId: string,
) {
  const expectedString = await fs.readFile(
    path.resolve(
      __dirname,
      `./${protocolId}/products/${productId}/tests/snapshots/${testKey(
        testCase,
      )}.json`,
    ),
    'utf-8',
  )

  const { snapshot, blockNumber, rpcResponses } = bigintJsonParse(
    expectedString,
  ) as {
    snapshot: unknown
    blockNumber?: number
    rpcResponses?: RpcInterceptedResponses
  }

  return {
    snapshot,
    blockNumber,
    rpcResponses,
  }
}
