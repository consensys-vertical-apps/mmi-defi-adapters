import { promises as fs } from 'fs'
import path from 'path'
import { parse, print, types, visit } from 'recast'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import { DefiProvider } from '../defiProvider'
import { lowerFirst, pascalCase } from '../core/utils/caseConversion'
import { Protocol } from '../adapters/protocols'
import n = types.namedTypes
import b = types.builders

buildSchemas()

async function buildSchemas() {
  const defiProvider = new DefiProvider()
  const support = defiProvider.getSupport()

  for (const [protocolId, protocolAdapters] of Object.entries(support)) {
    const protocolKey = Object.keys(Protocol).find(
      (protocolKey) =>
        Protocol[protocolKey as keyof typeof Protocol] === protocolId,
    ) as keyof typeof Protocol

    for (const adapterSupport of protocolAdapters) {
      const productId = adapterSupport.protocolDetails.productId
      const adapterFilePath = path.resolve(
        `./src/adapters/${protocolId}/products/${productId}/${lowerFirst(
          protocolKey,
        )}${pascalCase(productId)}Adapter`,
      )

      const { WriteActionInputs } = await import(adapterFilePath)

      if (WriteActionInputs) {
        await addWriteActionInputs({
          protocolKey,
          protocolId,
          productId,
        })
      }
    }
  }
}

async function addWriteActionInputs({
  protocolKey,
  protocolId,
  productId,
}: {
  protocolKey: string
  protocolId: string
  productId: string
}) {
  const adaptersFile = path.resolve('./src/adapters/index.ts')
  const contents = await fs.readFile(adaptersFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    visitImportDeclaration(path) {
      const node = path.node
      if (
        node.source.value ===
          `./${protocolId}/products/${productId}/${lowerFirst(
            protocolKey,
          )}${pascalCase(productId)}Adapter` &&
        node.source.value.toLowerCase().includes('aave')
      ) {
        if (
          !node.specifiers!.some(
            (specifier) =>
              (specifier as n.ImportSpecifier).imported.name ===
              'GetTxParamsInput',
          )
        ) {
          node.specifiers!.push(
            b.importSpecifier(
              b.identifier('GetTxParamsInput'),
              b.identifier(
                `${protocolKey}${pascalCase(productId)}GetTxParamsInput`,
              ),
            ),
          )
        }

        if (
          !node.specifiers!.some(
            (specifier) =>
              (specifier as n.ImportSpecifier).imported.name ===
              'WriteActionInputs',
          )
        ) {
          node.specifiers!.push(
            b.importSpecifier(
              b.identifier('WriteActionInputs'),
              b.identifier(
                `${protocolKey}${pascalCase(productId)}WriteActionInputs`,
              ),
            ),
          )
        }

        // console.log(
        //   'AAAAAAAAAAAAAAAA',
        //   node!.specifiers![0],
        //   node!.specifiers![1],
        //   node!.specifiers![2],
        // )

        // const xxx = node.specifiers
        // const newImport = b.importDeclaration(
        //   [b.importSpecifier(b.identifier('WriteActionInputs'))],
        //   b.literal(`./${protocolId}/products/${productId}/writeActionSchemas`),
        // )
        // path.insertAfter(newImport)
      }
      this.traverse(path)
    },
    // visitProgram(path) {
    //   const programNode = path.value as n.Program
    //   this.traverse(path)
    // },
    // visitVariableDeclarator(path) {
    //   const node = path.node
    //   if (!n.Identifier.check(node.id)) {
    //     // Skips any other declaration
    //     return false
    //   }
    //   if (node.id.name === 'WriteActionInputs') {
    //     // addAdapterEntries(node, protocolKey, adapterClassName, chainKeys)
    //   } else if (node.id.name === 'GetTransactionParamsInputSchema') {
    //     //
    //   }
    //   this.traverse(path)
    // },
  })

  await writeCodeFile(adaptersFile, print(ast).code)
}
