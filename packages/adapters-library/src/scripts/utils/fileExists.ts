import { promises as fs } from 'node:fs'

export async function fileExists(filePath: string) {
  return await fs
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}
