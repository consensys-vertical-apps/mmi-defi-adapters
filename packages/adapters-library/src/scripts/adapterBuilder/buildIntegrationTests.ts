import { promises as fs } from 'node:fs'
import path from 'node:path'
import partition from 'lodash/partition'
import { parse, print, types, visit } from 'recast'
import { lowerFirst } from '../../core/utils/caseConversion'
import { writeAndLintFile } from '../../core/utils/writeAndLintFile'
import { testCases } from './templates/testCases'
import { fileExists } from '../utils/fileExists'
import { sortEntries } from '../utils/sortEntries'
import n = types.namedTypes
import b = types.builders

/**
 * @description Creates a new file for integration tests if it doesn't exist
 */
export async function buildIntegrationTests({
  protocolId,
  protocolKey,
  productId,
}: {
  protocolId: string
  protocolKey: string
  productId: string
}) {
  const testCasesFilePath = `./packages/adapters-library/src/adapters/${protocolId}/tests/testCases.ts`

  if (await fileExists(testCasesFilePath)) {
    return
  }

  await writeAndLintFile(testCasesFilePath, testCases(productId))

  const testsFile = path.resolve(
    './packages/adapters-library/src/adapters/integration.test.ts',
  )
  const contents = await fs.readFile(testsFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitProgram(path) {
      const programNode = path.value as n.Program

      addTestCasesImport(programNode, protocolId, protocolKey)

      this.traverse(path)
    },
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        return false
      }

      if (
        node.id.name === 'protocolTestCases' &&
        n.ObjectExpression.check(node.init)
      ) {
        if (
          node.init.properties.some(
            (property) =>
              n.ObjectProperty.check(property) &&
              n.MemberExpression.check(property.key) &&
              n.Identifier.check(property.key.property) &&
              property.key.property.name === protocolKey,
          )
        ) {
          return false
        }

        const newEntry = b.objectProperty(
          b.memberExpression(
            b.identifier('Protocol'),
            b.identifier(protocolKey),
          ),
          b.identifier(`${lowerFirst(protocolKey)}TestCases`),
        )
        newEntry.computed = true

        node.init.properties.push(newEntry)

        sortEntries(
          node.init.properties,
          (entry) => ((entry as n.ObjectProperty).value as n.Identifier).name,
        )
      }

      this.traverse(path)
    },
  })

  await writeAndLintFile(testsFile, print(ast).code)
}

/**
 * @description Adds a new entry to the imports for the test cases
 *
 * @param programNode AST node for the Protocol program
 */
function addTestCasesImport(
  programNode: n.Program,
  protocolId: string,
  protocolKey: string,
) {
  const [importNodes, codeAfterImports] = partition(programNode.body, (node) =>
    n.ImportDeclaration.check(node),
  )

  const newImportEntry = buildImportTestCasesEntry(protocolId, protocolKey)

  programNode.body = [...importNodes, newImportEntry, ...codeAfterImports]
}

/*
  import { testCases as <protocolId>TestCases } from './<protocolId>/tests/testCases'
  */
function buildImportTestCasesEntry(protocolId: string, protocolKey: string) {
  return b.importDeclaration(
    [
      b.importSpecifier(
        b.identifier('testCases'),
        b.identifier(`${lowerFirst(protocolKey)}TestCases`),
      ),
    ],
    b.literal(`./${protocolId}/tests/testCases`),
  )
}
