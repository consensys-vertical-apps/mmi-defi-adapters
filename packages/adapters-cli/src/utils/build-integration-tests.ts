import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse, print, types, visit } from 'recast'
import { pascalCase } from '@metamask-institutional/defi-adapters'
import { partition, lowerFirst } from 'lodash-es'
import { testCases } from '../templates/testCases.js'
import { writeAndLintFile } from './write-and-lint-file.js'
import { fileExists } from './file-exists.js'
import { sortEntries } from './sort-entries.js'
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
  const testCasesFilePath = `./packages/adapters-library/src/adapters/${protocolId}/products/${productId}/tests/testCases.ts`

  if (!(await fileExists(testCasesFilePath))) {
    await writeAndLintFile(testCasesFilePath, testCases())
  }

  const testsFile = path.resolve(
    './packages/adapters-library/src/adapters/integration.test.ts',
  )
  const contents = await fs.readFile(testsFile, 'utf-8')
  const ast = parse(contents, {
    parser: await import('recast/parsers/typescript.js'),
  })

  visit(ast, {
    visitProgram(path) {
      const programNode = path.value
      if (n.Program.check(programNode)) {
        addTestCasesImport(programNode, protocolId, protocolKey, productId)
      }

      this.traverse(path)
    },
    visitVariableDeclarator(path) {
      const node = path.node

      if (
        n.Identifier.check(node.id) &&
        node.id.name === 'allTestCases' &&
        n.ObjectExpression.check(node.init) &&
        node.init.properties.every((property) =>
          n.ObjectProperty.check(property),
        )
      ) {
        addTestCasesEntry(
          node.init.properties as n.ObjectProperty[],
          protocolKey,
          productId,
        )
      }

      this.traverse(path)
    },
  })

  await writeAndLintFile(testsFile, print(ast).code)
}

/**
 * @description Adds a new entry to the imports for the test cases
 */
function addTestCasesImport(
  programNode: n.Program,
  protocolId: string,
  protocolKey: string,
  productId: string,
) {
  const [importNodes, codeAfterImports] = partition(programNode.body, (node) =>
    n.ImportDeclaration.check(node),
  )

  if (
    importNodes.some(
      (node) =>
        (node as n.ImportDeclaration).source.value ===
        `./${protocolId}/products/${productId}/tests/testCases`,
    )
  ) {
    return
  }

  const newImportEntry = buildImportTestCasesEntry(
    protocolId,
    protocolKey,
    productId,
  )

  programNode.body = [newImportEntry, ...importNodes, ...codeAfterImports]
}

// import { testCases as <protocolId><protocolId>TestCases } from './<protocolId>/products/<productId>/tests/testCases'
function buildImportTestCasesEntry(
  protocolId: string,
  protocolKey: string,
  productId: string,
) {
  return b.importDeclaration(
    [
      b.importSpecifier(
        b.identifier('testCases'),
        productTestCaseIdentifier(protocolKey, productId),
      ),
    ],
    b.literal(`./${protocolId}/products/${productId}/tests/testCases`),
  )
}

/**
 * @description Adds a new entry to the allTestCases object
 */
function addTestCasesEntry(
  protocolEntries: n.ObjectProperty[],
  protocolKey: string,
  productId: string,
) {
  if (
    !protocolEntries.some(
      (property) =>
        n.ObjectProperty.check(property) &&
        n.MemberExpression.check(property.key) &&
        n.Identifier.check(property.key.property) &&
        property.key.property.name === protocolKey,
    )
  ) {
    // [Protocol.<ProtocolKey>]: {}
    const newProtocolEntry = b.objectProperty(
      b.memberExpression(b.identifier('Protocol'), b.identifier(protocolKey)),
      b.objectExpression([]),
    )
    newProtocolEntry.computed = true

    protocolEntries.push(newProtocolEntry)

    sortEntries(
      protocolEntries,
      (entry) =>
        ((entry.key as n.MemberExpression).property as n.Identifier).name,
    )
  }

  const productEntries = (
    protocolEntries.find(
      (property) =>
        n.ObjectProperty.check(property) &&
        n.MemberExpression.check(property.key) &&
        n.Identifier.check(property.key.property) &&
        property.key.property.name === protocolKey,
    )!.value as n.ObjectExpression
  ).properties as n.ObjectProperty[]

  if (
    productEntries.some(
      (property) => (property.key as n.Literal).value === productId,
    )
  ) {
    return
  }

  const newProductEntry = b.objectProperty(
    b.literal(productId),
    productTestCaseIdentifier(protocolKey, productId),
  )
  newProductEntry.computed = true
  productEntries.push(newProductEntry)

  sortEntries(
    productEntries,
    (entry) => ((entry as n.ObjectProperty).value as n.Identifier).name,
  )
}

function productTestCaseIdentifier(protocolKey: string, productId: string) {
  return b.identifier(
    `${lowerFirst(protocolKey)}${pascalCase(productId)}TestCases`,
  )
}
