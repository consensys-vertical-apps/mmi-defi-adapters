import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import partition from 'lodash/partition'
import { parse, print, types, visit } from 'recast'
import { Chain } from '../../core/constants/chains'
import { lowerFirst } from '../../core/utils/caseConversion'
import { writeAndLintFile } from '../../core/utils/writeAndLintFile'
import { sortEntries } from '../utils/sortEntries'
import n = types.namedTypes
import b = types.builders

/**
 * @description Writes changes to include new adapter in src/adapters/supportedProtocols.ts file
 */
export async function exportAdapter({
  protocolKey,
  protocolId,
  productId,
  adapterClassName,
  chainKeys,
}: {
  protocolKey: string
  protocolId: string
  productId: string
  adapterClassName: string
  chainKeys: (keyof typeof Chain)[]
}) {
  const adaptersFile = path.resolve(
    './packages/adapters-library/src/adapters/supportedProtocols.ts',
  )
  const contents = await fs.readFile(adaptersFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitProgram(path) {
      const programNode = path.value as n.Program

      addAdapterImport(programNode, protocolId, productId, adapterClassName)

      this.traverse(path)
    },
    visitVariableDeclarator(path) {
      const node = path.node
      if (!n.Identifier.check(node.id)) {
        // Skips any other declaration
        return false
      }

      if (node.id.name === 'supportedProtocols') {
        addAdapterEntries(node, protocolKey, adapterClassName, chainKeys)
      }

      this.traverse(path)
    },
  })

  await writeAndLintFile(adaptersFile, print(ast).code)
}

/**
 * @description Adds a new entry to the imports for the new adapter
 *
 * @param programNode AST node for the Protocol program
 */
function addAdapterImport(
  programNode: n.Program,
  protocolId: string,
  productId: string,
  adapterClassName: string,
) {
  const [importNodes, codeAfterImports] = partition(programNode.body, (node) =>
    n.ImportDeclaration.check(node),
  )

  const newImportEntry = buildImportAdapterEntry(
    protocolId,
    productId,
    adapterClassName,
  )

  programNode.body = [...importNodes, newImportEntry, ...codeAfterImports]
}

/**
 * @description Adds chain entries for the adapter to the supportedProtocols constant
 *
 * @param supportedProtocolsDeclaratorNode AST node for the supportedProtocols declarator
 */
function addAdapterEntries(
  supportedProtocolsDeclaratorNode: n.VariableDeclarator,
  protocolKey: string,
  adapterClassName: string,
  chainKeys: (keyof typeof Chain)[],
) {
  const supportedProtocolsObjectNode = supportedProtocolsDeclaratorNode.init
  if (!n.ObjectExpression.check(supportedProtocolsObjectNode)) {
    throw new Error('Incorrectly typed supportedProtocols object')
  }

  let protocolChainsObjectPropertyNode =
    supportedProtocolsObjectNode.properties.find((property) => {
      if (
        !n.ObjectProperty.check(property) ||
        !n.MemberExpression.check(property.key) ||
        !n.Identifier.check(property.key.property)
      ) {
        throw new Error('Incorrectly typed supportedProtocols object')
      }

      return property.key.property.name === protocolKey
    }) as n.ObjectProperty

  if (!protocolChainsObjectPropertyNode) {
    protocolChainsObjectPropertyNode = buildSupportedProtocolEntry(protocolKey)

    supportedProtocolsObjectNode.properties.push(
      protocolChainsObjectPropertyNode,
    )

    sortEntries(
      supportedProtocolsObjectNode.properties,
      (entry) =>
        (
          ((entry as n.ObjectProperty).key as n.MemberExpression)
            .property as n.Identifier
        ).name,
    )
  }

  const protocolChainEntries = protocolChainsObjectPropertyNode.value
  if (!n.ObjectExpression.check(protocolChainEntries)) {
    throw new Error('Incorrectly typed supportedProtocols object')
  }

  for (const chainKey of chainKeys) {
    let protocolChainEntryNode = protocolChainEntries.properties.find(
      (property) => {
        if (
          !n.ObjectProperty.check(property) ||
          !n.MemberExpression.check(property.key) ||
          !n.Identifier.check(property.key.property)
        ) {
          throw new Error('Incorrectly typed supportedProtocols object')
        }

        return property.key.property.name === chainKey
      },
    ) as n.ObjectProperty

    if (!protocolChainEntryNode) {
      protocolChainEntryNode = buildChainEntry(chainKey)

      protocolChainEntries.properties.push(protocolChainEntryNode)
    }

    if (!n.ArrayExpression.check(protocolChainEntryNode.value)) {
      throw new Error('Incorrectly typed supportedProtocols object')
    }

    const newAdapterEntry = buildAdapterEntry(adapterClassName)
    protocolChainEntryNode.value.elements.push(newAdapterEntry)
  }
}

/*
import { <AdapterClassName> } from './<protocol-id>/products/<product-id>/<adapterClassName>'
*/
function buildImportAdapterEntry(
  protocolId: string,
  productId: string,
  adapterClassName: string,
) {
  return b.importDeclaration(
    [b.importSpecifier(b.identifier(adapterClassName))],
    b.literal(
      `./${protocolId}/products/${productId}/${lowerFirst(adapterClassName)}`,
    ),
  )
}

/*
[Protocol.<ProtocolKey>]: {}
*/
function buildSupportedProtocolEntry(protocolKey: string) {
  const key = b.memberExpression(
    b.identifier('Protocol'),
    b.identifier(protocolKey),
  )
  const value = b.objectExpression([])

  const newEntry = b.objectProperty(key, value)
  newEntry.computed = true

  return newEntry
}

/*
[Chain.<ChainKey>]: [],
*/
function buildChainEntry(chainKey: keyof typeof Chain) {
  const key = b.memberExpression(b.identifier('Chain'), b.identifier(chainKey))
  const value = b.arrayExpression([])

  const newEntry = b.objectProperty(key, value)
  newEntry.computed = true

  return newEntry
}

/*
<AdapterClassName>
*/
function buildAdapterEntry(adapterClassName: string) {
  return b.identifier(`${adapterClassName}`)
}
