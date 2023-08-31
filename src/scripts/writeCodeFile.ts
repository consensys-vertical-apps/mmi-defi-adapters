import { ESLint } from 'eslint'
import { promises } from 'fs'

export const writeCodeFile = async (filePath: string, content: string) => {
  await promises.writeFile(filePath, content)

  const eslint = new ESLint({ fix: true })
  const results = await eslint.lintFiles(filePath)
  await ESLint.outputFixes(results)
}
