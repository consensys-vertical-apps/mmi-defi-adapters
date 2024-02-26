import { promises as fs } from 'fs'
import path from 'path'
import { Command } from 'commander'
import { parse, print, types, visit } from 'recast'
import { Protocol } from '../adapters/protocols'
import { Chain, ChainName } from '../core/constants/chains'
import { ProviderMissingError } from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { bigintJsonStringify } from '../core/utils/bigintJson'
import { kebabCase } from '../core/utils/caseConversion'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import { DefiProvider } from '../defiProvider'
import type { TestCase } from '../types/testCase'
import { multiProtocolFilter } from './commandFilters'
import n = types.namedTypes
import b = types.builders
import { DefiPositionResponse, DefiProfitsResponse } from '../types/response'

export function buildSnapshots(program: Command, defiProvider: DefiProvider) {
  program
    .command('build-snapshots')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .showHelpAfterError()
    .action(async ({ protocols }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)

      for (const protocolId of Object.values(Protocol)) {
        if (filterProtocolIds && !filterProtocolIds.includes(protocolId)) {
          continue
        }

        const testCases: TestCase[] = (
          await import(
            path.resolve(__dirname, `../adapters/${protocolId}/tests/testCases`)
          )
        ).testCases

        for (const [index, testCase] of testCases.entries()) {
          const chainId = testCase.chainId

          const snapshotFileContent = await (async () => {
            switch (testCase.method) {
              case 'positions': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const result = {
                  blockNumber,
                  snapshot: await defiProvider.getPositions({
                    ...testCase.input,
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }

                await updateBlockNumber(protocolId, index, blockNumber)

                await updateFilterProtocolTokenAddresses(
                  protocolId,
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

                const result = {
                  blockNumber,
                  snapshot: await defiProvider.getProfits({
                    ...testCase.input,
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    toBlockNumbersOverride: {
                      [chainId]: blockNumber,
                    },
                  }),
                }

                await updateBlockNumber(protocolId, index, blockNumber)

                await updateFilterProtocolTokenAddresses(
                  protocolId,
                  index,
                  result.snapshot,
                )

                return result
              }

              case 'deposits': {
                return {
                  snapshot: await defiProvider.getDeposits({
                    ...testCase.input,
                    chainId: chainId,
                    protocolId: protocolId,
                  }),
                }
              }

              case 'withdrawals': {
                return {
                  snapshot: await defiProvider.getWithdrawals({
                    ...testCase.input,
                    chainId: chainId,
                    protocolId: protocolId,
                  }),
                }
              }
              case 'repays': {
                return {
                  snapshot: await defiProvider.getRepays({
                    ...testCase.input,
                    chainId: chainId,
                    protocolId: protocolId,
                  }),
                }
              }

              case 'borrows': {
                return {
                  snapshot: await defiProvider.getBorrows({
                    ...testCase.input,
                    chainId: chainId,
                    protocolId: protocolId,
                  }),
                }
              }

              case 'prices': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const result = {
                  blockNumber,
                  snapshot: await defiProvider.getPrices({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                    filterProtocolToken: testCase.filterProtocolToken,
                  }),
                }

                await updateBlockNumber(protocolId, index, blockNumber)

                return result
              }

              case 'tvl': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const result = {
                  blockNumber,
                  snapshot: await defiProvider.getTotalValueLocked({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }

                await updateBlockNumber(protocolId, index, blockNumber)

                return result
              }

              case 'apy': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const result = {
                  blockNumber,
                  snapshot: await defiProvider.getApy({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }

                await updateBlockNumber(protocolId, index, blockNumber)

                return result
              }

              case 'apr': {
                const blockNumber =
                  testCase.blockNumber ??
                  (await getLatestStableBlock(
                    defiProvider.chainProvider.providers[chainId],
                    chainId,
                  ))

                const result = {
                  blockNumber,
                  snapshot: await defiProvider.getApr({
                    filterChainIds: [chainId],
                    filterProtocolIds: [protocolId],
                    blockNumbers: {
                      [chainId]: blockNumber,
                    },
                  }),
                }

                await updateBlockNumber(protocolId, index, blockNumber)

                return result
              }
              case 'tx-params': {
                return {
                  snapshot: await defiProvider.getTransactionParams({
                    chainId,
                    protocolId,
                    ...testCase.input,
                  }),
                }
              }
            }
          })()

          const filePath = `./src/adapters/${protocolId}/tests/snapshots/${
            ChainName[testCase.chainId]
          }.${testCase.method}${
            testCase.key ? `.${kebabCase(testCase.key)}` : ''
          }.json`

          await fs.mkdir(path.dirname(filePath), { recursive: true })

          await fs.writeFile(
            filePath,
            bigintJsonStringify(snapshotFileContent, 2),
            'utf-8',
          )

          // Update test case
        }
      }
    })
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
  index: number,
  blockNumber: number,
) {
  const testCasesFile = path.resolve(
    `./src/adapters/${protocolId}/tests/testCases.ts`,
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

  await writeCodeFile(testCasesFile, print(ast).code)
}

async function updateFilterProtocolTokenAddresses(
  protocolId: Protocol,
  index: number,
  snapshot: DefiPositionResponse[] | DefiProfitsResponse[],
) {
  const protocolTokenAddresses = snapshot.flatMap((position) => {
    if (!position.success) {
      return []
    }

    return position.tokens.map((token) => token.address)
  })

  const testCasesFile = path.resolve(
    `./src/adapters/${protocolId}/tests/testCases.ts`,
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

        return false
      }

      this.traverse(path)
    },
  })

  await writeCodeFile(testCasesFile, print(ast).code)
}
