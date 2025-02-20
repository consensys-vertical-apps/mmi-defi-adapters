import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  Chain,
  ChainName,
  type DefiPositionResponse,
  DefiProvider,
  Protocol,
  type TestCase,
  filterMapSync,
  multiProtocolFilter,
} from '@metamask-institutional/defi-adapters'
import { Command, Option } from 'commander'
import { kebabCase } from 'lodash-es'
import { parse, print, types, visit } from 'recast'
import {
  type RpcInterceptedResponses,
  startRpcSnapshot,
} from '../utils/rpc-interceptor.js'
import { writeAndLintFile } from '../utils/write-and-lint-file.js'
import n = types.namedTypes
import b = types.builders

export function buildSnapshotsCommand(
  program: Command,
  defiProvider: DefiProvider,
) {
  const allowedMethods = ['positions', 'prices']

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
    .addOption(
      new Option(
        '-m, --method <method>',
        `specify a method to run (allowed: ${allowedMethods.join(', ')})`,
      ).choices(allowedMethods),
    )
    .option('-ul, --latency', 'update latency value')
    .showHelpAfterError()
    .action(async ({ protocols, products, key, method, latency }) => {
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
            `@metamask-institutional/defi-adapters/dist/adapters/${protocolId}/products/${productId}/tests/testCases.js`
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
            disableEthersBatching: true,
          })

          const msw = startRpcSnapshot(
            Object.values(defiProvider.chainProvider.providers).map(
              (provider) => provider._getConnection().url,
            ),
          )

          const chainId = testCase.chainId

          // TODO Add Solana support for snapshots
          if (chainId === Chain.Solana) {
            continue
          }

          const filePath = `./packages/adapters-library/src/adapters/${protocolId}/products/${productId}/tests/snapshots/${
            ChainName[testCase.chainId]
          }.${testCase.method}${
            testCase.key ? `.${kebabCase(testCase.key)}` : ''
          }.json`

          const previousLatency = await getPreviousLatency(filePath)

          const snapshotFileContent = await (async () => {
            switch (testCase.method) {
              case 'positions': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await defiProvider.chainProvider.providers[
                    chainId
                  ].getStableBlockNumber())

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

              case 'prices': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await defiProvider.chainProvider.providers[
                    chainId
                  ].getStableBlockNumber())

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
            }
          })()

          const rpcResponses = Object.entries(msw.interceptedResponses).reduce(
            (acc, [key, response]) => {
              acc[key] = {
                result: response.result,
                error: response.error,
              }

              if (
                process.env.DEFI_ADAPTERS_SAVE_INTERCEPTED_REQUESTS === 'true'
              ) {
                acc[key]!.request = response.request
                acc[key]!.metrics = response.metrics
              }

              return acc
            },
            {} as RpcInterceptedResponses,
          )

          // TODO: Remove this once we have a better way to handle bigint
          await writeAndLintFile(
            filePath,
            JSON.stringify(
              {
                ...snapshotFileContent,
                rpcResponses,
              },
              (_, value) =>
                typeof value === 'bigint' ? `${value.toString()}n` : value,
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
    parser: await import('recast/parsers/typescript.js'),
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
  snapshot: DefiPositionResponse[],
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
    parser: await import('recast/parsers/typescript.js'),
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

async function getPreviousLatency(
  filePath: string,
): Promise<string | undefined> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const json = JSON.parse(content)

    // Return the latency value if it exists, otherwise return undefined
    return json.latency || undefined
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File does not exist, return undefined
      return undefined
    }
    throw new Error(
      `Error reading file at ${filePath}: ${
        (error as { message: string }).message
      }`,
    )
  }
}

function getAggregatedValues(
  response: DefiPositionResponse[],
  chainId: Chain,
): string[] {
  const aggregatedValues: string[] = []

  if (chainId === Chain.Linea) {
    return aggregatedValues
  }

  for (const position of response) {
    if (!position.success) {
      continue
    }

    for (const protocolToken of position.tokens) {
      const marketValue = extractMarketValue(protocolToken.tokens!) || 0

      const formattedMarketValue = `USD${marketValue
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

      aggregatedValues.push(formattedMarketValue)
    }
  }

  return aggregatedValues
}

type Token = {
  balance?: number
  price?: number
  tokens?: Token[]
}

function extractMarketValue(tokens: Token[]): number {
  if (!tokens) {
    return 0
  }

  let marketValue = 0
  for (const token of tokens) {
    if (token.price !== undefined) {
      // If the token has a price, use it and skip further recursion
      marketValue += token.balance! * token.price
    } else if (token.tokens && token.tokens.length > 0) {
      // Recursively calculate the market value of child tokens
      marketValue += extractMarketValue(token.tokens)
    } else {
      // If no price and no child tokens, default to balance * 0 (or whatever default logic is needed)
      marketValue += token.balance! * (token.price || 0)
    }
  }

  return marketValue
}
