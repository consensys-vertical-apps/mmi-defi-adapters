import { testCases } from '../templates/testCases.js'
import { fileExists } from './file-exists.js'
import { writeAndLintFile } from './write-and-lint-file.js'

/**
 * @description Creates a new file for snapshot tests if it doesn't exist
 */
export async function buildIntegrationTests({
  protocolId,
  productId,
}: {
  protocolId: string
  productId: string
}) {
  const testCasesFilePath = `./packages/adapters-library/src/adapters/${protocolId}/products/${productId}/tests/testCases.ts`

  if (!(await fileExists(testCasesFilePath))) {
    await writeAndLintFile(testCasesFilePath, testCases())
  }
}
