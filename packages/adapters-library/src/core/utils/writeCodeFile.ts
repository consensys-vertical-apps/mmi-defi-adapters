import { promises as fs } from 'node:fs'
import path from 'node:path'

export const writeCodeFile = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })

  await fs.writeFile(filePath, content, 'utf-8')

  // const eslint = new ESLint({ fix: true })
  // const results = await eslint.lintFiles(filePath)
  // await ESLint.outputFixes(results)
}
