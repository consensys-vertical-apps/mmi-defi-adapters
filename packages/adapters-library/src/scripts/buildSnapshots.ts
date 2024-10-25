import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { parse, print, types, visit } from 'recast'
import {
  getAggregatedValues,
  getAggregatedValuesMovements,
} from '../adapters/aggrigateValues'
import { Protocol } from '../adapters/protocols'
import type { GetTransactionParams } from '../adapters/supportedProtocols'
import { Chain, ChainIdToChainNameMap } from '../core/constants/chains'
import { ProviderMissingError } from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { bigintJsonStringify } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { filterMapSync } from '../core/utils/filters'
import { writeAndLintFile } from '../core/utils/writeAndLintFile'
import { DefiProvider } from '../defiProvider'
import { DefiPositionResponse, DefiProfitsResponse } from '../types/response'
import type { TestCase } from '../types/testCase'
import { multiProtocolFilter } from './commandFilters'
import { startRpcSnapshot } from './rpcInterceptor'
import n = types.namedTypes
import b = types.builders
import { getPreviousLatency } from '../core/utils/readFile'

export function buildSnapshots(program: Command, defiProvider: DefiProvider) {
  const allowedMethods = [
    'positions',
    'profits',
    'deposits',
    'withdrawals',
    'repays',
    'borrows',
    'prices',
    'tvl',
    'tx-params',
  ]

  program
    .command('build-snapshots')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-pd, --products <products>',
      'comma-separated products filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-k, --key <test-key>',
      'test key must be used with protocols filter',
    )
    .option(
      '-m, --method <method>',
      `specify a method to run (allowed: ${allowedMethods.join(', ')})`,
    )
    .option('-ul, --latency', 'update latency value')
    .showHelpAfterError()
    .action(async ({ protocols, products, key, method, latency }) => {
      // Validate method
      if (method && !allowedMethods.includes(method)) {
        throw new Error(
          `Invalid method: ${method}. Allowed methods are: ${allowedMethods.join(
            ', ',
          )}.`,
        )
      }

      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterProductIds = (products as string | undefined)?.split(',')

      const allProtocols = await defiProvider.getSupport({ filterProtocolIds })
      const allProducts = Object.values(allProtocols).flatMap(
        (protocolAdapters) =>
          filterMapSync(protocolAdapters, (adapter) => {
            if (
              filterProductIds &&
              !filterProductIds.includes(adapter.protocolDetails.productId)
            ) {
              return undefined
            }

            return {
              protocolId: adapter.protocolDetails.protocolId,
              productId: adapter.protocolDetails.productId,
            }
          }),
      )

      for (const { protocolId, productId } of allProducts) {
        const testCases: TestCase[] = (
          await import(
            path.resolve(
              __dirname,
              `../adapters/${protocolId}/products/${productId}/tests/testCases`,
            )
          )
        ).testCases

        for (const [index, testCase] of testCases.entries()) {
          if (key && testCase.key !== key) {
            continue
          }

          if (method && testCase.method !== method) {
            continue
          }

          // Recreate the provider for each test case to avoid cached data
          const defiProvider = new DefiProvider({
            useMulticallInterceptor: false,
          })

          const msw = startRpcSnapshot(
            Object.values(defiProvider.chainProvider.providers).map(
              (provider) => provider._getConnection().url,
            ),
          )

          const chainId = testCase.chainId

          const filePath = `./packages/adapters-library/src/adapters/${protocolId}/products/${productId}/tests/snapshots/${
            ChainIdToChainNameMap[testCase.chainId]
          }.${testCase.method}${
            testCase.key ? `.${kebabCase(testCase.key)}` : ''
          }.json`

          const previousLatency = await getPreviousLatency(filePath)

          const snapshotFileContent = await (async () => {
            switch (testCase.method) {
              case 'positions': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const startTime = Date.now()

                const snapshot = await defiProvider.getPositions({
                  ...testCase.input,
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                  filterProductIds: [productId],
                  blockNumbers: {
                    [chainId]: blockNumber,
                  },
                })

                const endTime = Date.now()

                const aggregatedValues = getAggregatedValues(snapshot, chainId)

                const result = {
                  blockNumber,
                  latency: getLatency(
                    endTime,
                    startTime,
                    latency,
                    previousLatency,
                  ),
                  aggregatedValues,
                  snapshot,
                }

                await updateBlockNumber(
                  protocolId,
                  productId,
                  index,
                  blockNumber,
                )

                await updateFilters(
                  protocolId,
                  productId,
                  index,
                  result.snapshot,
                )

                return result
              }

              case 'profits': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const startTime = Date.now()

                const snapshot = await defiProvider.getProfits({
                  ...testCase.input,
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                  filterProductIds: [productId],
                  toBlockNumbersOverride: {
                    [chainId]: blockNumber,
                  },
                })

                const endTime = Date.now()

                const result = {
                  blockNumber,
                  latency: getLatency(
                    endTime,
                    startTime,
                    latency,
                    previousLatency,
                  ),
                  snapshot,
                }

                await updateBlockNumber(
                  protocolId,
                  productId,
                  index,
                  blockNumber,
                )

                await updateFilters(
                  protocolId,
                  productId,
                  index,
                  result.snapshot,
                )

                return result
              }

              case 'deposits': {
                const startTime = Date.now()
                const snapshot = await defiProvider.getDeposits({
                  ...testCase.input,
                  chainId: chainId,
                  protocolId: protocolId,
                  productId: productId,
                })

                const aggregatedValues = getAggregatedValuesMovements(
                  snapshot,
                  chainId,
                )

                const endTime = Date.now()

                return {
                  aggregatedValues,
                  latency: getLatency(
                    endTime,
                    startTime,
                    latency,
                    previousLatency,
                  ),
                  snapshot,
                }
              }

              case 'withdrawals': {
                const startTime = Date.now()
                const result = await defiProvider.getWithdrawals({
                  ...testCase.input,
                  chainId: chainId,
                  protocolId: protocolId,
                  productId: productId,
                })

                const aggregatedValues = getAggregatedValuesMovements(
                  result,
                  chainId,
                )

                const endTime = Date.now()

                return {
                  aggregatedValues,
                  latency: getLatency(
                    endTime,
                    startTime,
                    latency,
                    previousLatency,
                  ),
                  snapshot: result,
                }
              }
              case 'repays': {
                const startTime = Date.now()

                const snapshot = await defiProvider.getRepays({
                  ...testCase.input,
                  chainId: chainId,
                  protocolId: protocolId,
                  productId: productId,
                })

                const endTime = Date.now()

                return {
                  latency: getLatency(
                    endTime,
                    startTime,
                    latency,
                    previousLatency,
                  ),
                  snapshot,
                }
              }

              case 'borrows': {
                const startTime = Date.now()
                const result = await defiProvider.getBorrows({
                  ...testCase.input,
                  chainId: chainId,
                  protocolId: protocolId,
                  productId: productId,
                })

                const aggregatedValues = getAggregatedValuesMovements(
                  result,
                  chainId,
                )

                const endTime = Date.now()

                return {
                  latency: getLatency(
                    endTime,
                    startTime,
                    latency,
                    previousLatency,
                  ),
                  snapshot: result,
                  aggregatedValues,
                }
              }

              case 'prices': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const startTime = Date.now()

                const snapshot = await defiProvider.unwrap({
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                  filterProductIds: [productId],
                  blockNumbers: {
                    [chainId]: blockNumber,
                  },
                  filterProtocolToken: testCase.filterProtocolToken,
                })

                const endTime = Date.now()

                const result = {
                  latency: getLatency(
                    endTime,
                    startTime,
                    latency,
                    previousLatency,
                  ),
                  blockNumber,
                  snapshot,
                }

                await updateBlockNumber(
                  protocolId,
                  productId,
                  index,
                  blockNumber,
                )

                return result
              }

              case 'tvl': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const startTime = Date.now()

                const snapshot = await defiProvider.getTotalValueLocked({
                  filterChainIds: [chainId],
                  filterProtocolIds: [protocolId],
                  filterProductIds: [productId],
                  filterProtocolTokens: testCase.filterProtocolTokens,
                  blockNumbers: {
                    [chainId]: blockNumber,
                  },
                })

                const endTime = Date.now()

                const result = {
                  latency: getLatency(
                    endTime,
                    startTime,
                    latency,
                    previousLatency,
                  ),
                  blockNumber,
                  snapshot,
                }

                await updateBlockNumber(
                  protocolId,
                  productId,
                  index,
                  blockNumber,
                )

                return result
              }

              case 'tx-params': {
                const inputs = {
                  ...testCase.input,
                  protocolId,
                  chainId,
                  productId,
                } as GetTransactionParams

                return {
                  snapshot: await defiProvider.getTransactionParams(inputs),
                }
              }
            }
          })()

          await writeAndLintFile(
            filePath,
            bigintJsonStringify(
              {
                ...snapshotFileContent,
                rpcResponses: msw.interceptedRequests,
              },
              2,
            ),
          )

          msw.stop()
        }
      }

      process.exit()
    })
}

function getLatency(
  endTime: number,
  startTime: number,
  updateLatency: boolean,
  previousLatency?: string,
) {
  if (updateLatency || !previousLatency) {
    return `Latency: ${(endTime - startTime) / 1000} seconds`
  }

  return previousLatency
}

async function getLatestStableBlock(
  provider: CustomJsonRpcProvider,
  chainId: Chain,
): Promise<number> {
  if (!provider) {
    throw new ProviderMissingError(chainId)
  }

  return provider.getStableBlockNumber()
}

async function updateBlockNumber(
  protocolId: Protocol,
  productId: string,
  index: number,
  blockNumber: number,
) {
  const testCasesFile = path.resolve(
    `./packages/adapters-library/src/adapters/${protocolId}/products/${productId}/tests/testCases.ts`,
  )
  const contents = await fs.readFile(testCasesFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'testCases') {
        const testCasesArrayNode = node.init
        if (!n.ArrayExpression.check(testCasesArrayNode)) {
          throw new Error('Incorrectly typed testCases array')
        }
        const testCaseNode = testCasesArrayNode.elements[index]
        if (!n.ObjectExpression.check(testCaseNode)) {
          return false
        }
        const blockNumberNode = testCaseNode.properties.find(
          (property) =>
            n.ObjectProperty.check(property) &&
            n.Identifier.check(property.key) &&
            property.key.name === 'blockNumber',
        )

        if (blockNumberNode) {
          return false
        }

        testCaseNode.properties.push(
          b.objectProperty(
            b.identifier('blockNumber'),
            b.numericLiteral(blockNumber),
          ),
        )
      }

      this.traverse(path)
    },
  })

  await writeAndLintFile(testCasesFile, print(ast).code)
}

/**
 * Updates filterProtocolToken and filterTokenId properties
 */
async function updateFilters(
  protocolId: Protocol,
  productId: string,
  index: number,
  snapshot: DefiPositionResponse[] | DefiProfitsResponse[],
) {
  const protocolTokenAddresses = snapshot.flatMap((position) => {
    if (!position.success) {
      return []
    }

    return position.tokens.map((token) => token.address)
  })

  if (!protocolTokenAddresses.length) {
    return
  }

  const protocolTokenIds = snapshot.flatMap((position) => {
    if (!position.success) {
      return []
    }

    return position.tokens
      .map((token) => token.tokenId)
      .filter((tokenId) => tokenId !== undefined)
  })

  const testCasesFile = path.resolve(
    `./packages/adapters-library/src/adapters/${protocolId}/products/${productId}/tests/testCases.ts`,
  )
  const contents = await fs.readFile(testCasesFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'testCases') {
        const testCasesArrayNode = node.init
        if (!n.ArrayExpression.check(testCasesArrayNode)) {
          throw new Error('Incorrectly typed testCases array')
        }
        const testCaseNode = testCasesArrayNode.elements[index]
        if (!n.ObjectExpression.check(testCaseNode)) {
          return false
        }

        const inputNode = testCaseNode.properties.find(
          (property): property is n.ObjectProperty =>
            n.ObjectProperty.check(property) &&
            n.Identifier.check(property.key) &&
            property.key.name === 'input',
        )

        if (!inputNode || !n.ObjectExpression.check(inputNode.value)) {
          throw new Error('Incorrectly typed testCases array')
        }

        const filterProtocolTokensNode = inputNode.value.properties.find(
          (property) =>
            n.ObjectProperty.check(property) &&
            n.Identifier.check(property.key) &&
            property.key.name === 'filterProtocolTokens',
        )

        if (filterProtocolTokensNode) {
          return false
        }

        // update filterProtocolTokens
        inputNode.value.properties.push(
          b.objectProperty(
            b.identifier('filterProtocolTokens'),
            b.arrayExpression(
              protocolTokenAddresses.map((protocolTokenAddress) =>
                b.stringLiteral(protocolTokenAddress),
              ),
            ),
          ),
        )

        // update filterTokenIds if exists
        if (protocolTokenIds.length > 0) {
          const filterTokenIdsNode = inputNode.value.properties.find(
            (property) =>
              n.ObjectProperty.check(property) &&
              n.Identifier.check(property.key) &&
              property.key.name === 'filterTokenIds',
          )

          if (filterTokenIdsNode) {
            return false
          }

          inputNode.value.properties.push(
            b.objectProperty(
              b.identifier('filterTokenIds'),
              b.arrayExpression(
                protocolTokenIds.map((tokenId) =>
                  b.stringLiteral(tokenId as string),
                ),
              ),
            ),
          )
        }

        return false
      }

      this.traverse(path)
    },
  })

  await writeAndLintFile(testCasesFile, print(ast).code)
}
