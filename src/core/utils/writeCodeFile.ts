import { promises } from 'fs'
import { ESLint } from 'eslint'

export const writeCodeFile = async (filePath: string, content: string) => {
  await promises.writeFile(filePath, content, 'utf-8')

  const eslint = new ESLint({ fix: true })
  const results = await eslint.lintFiles(filePath)
  await ESLint.outputFixes(results)
}
