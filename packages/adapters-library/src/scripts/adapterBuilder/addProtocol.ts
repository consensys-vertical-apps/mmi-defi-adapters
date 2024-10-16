import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse, print, types, visit } from 'recast'
import { writeAndLintFile } from '../../core/utils/writeAndLintFile.js'
import { sortEntries } from '../utils/sortEntries.js'
import n = types.namedTypes
import b = types.builders

/**
 * @description Writes changes to include new adapter in src/adapters/protocols.ts file
 */
export async function addProtocol({
  protocolKey,
  protocolId,
}: {
  protocolKey: string
  protocolId: string
}) {
  const protocolsFile = path.resolve(
    './packages/adapters-library/src/adapters/protocols.ts',
  )
  const contents = await fs.readFile(protocolsFile, 'utf-8')
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

      if (node.id.name === 'Protocol') {
        addProtocolEntry(node, protocolKey, protocolId)
      }

      this.traverse(path)
    },
  })

  await writeAndLintFile(protocolsFile, print(ast).code)
}

/**
 * @description Adds a new entry to the Protocol constant if it does not exist.
 *
 * @param protocolListDeclaratorNode AST node for the Protocol declarator
 */
function addProtocolEntry(
  protocolListDeclaratorNode: n.VariableDeclarator,
  protocolKey: string,
  protocolId: string,
) {
  const protocolListObjectNode = protocolListDeclaratorNode.init
  if (
    !n.TSAsExpression.check(protocolListObjectNode) ||
    !n.ObjectExpression.check(protocolListObjectNode.expression)
  ) {
    throw new Error('Incorrectly typed Protocol object')
  }

  const protocolEntryObjectNode =
    protocolListObjectNode.expression.properties.find((property) => {
      if (
        !n.ObjectProperty.check(property) ||
        !n.Identifier.check(property.key)
      ) {
        throw new Error('Incorrectly typed Protocol object')
      }

      return property.key.name === protocolKey
    })

  if (!protocolEntryObjectNode) {
    protocolListObjectNode.expression.properties.push(
      buildProtocolEntry(protocolKey, protocolId),
    )

    sortEntries(
      protocolListObjectNode.expression.properties,
      (entry) => ((entry as n.ObjectProperty).key as n.Identifier).name,
    )
  }
}

/*
<ProtocolKey>: 'protocol-id'
*/
function buildProtocolEntry(protocolKey: string, protocolId: string) {
  const key = b.identifier(protocolKey)
  const value = b.stringLiteral(protocolId)

  return b.objectProperty(key, value)
}
