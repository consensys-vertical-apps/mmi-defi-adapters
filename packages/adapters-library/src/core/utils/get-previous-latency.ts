import { promises as fs } from 'node:fs'

export const getPreviousLatency = async (
  filePath: string,
): Promise<string | undefined> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const json = JSON.parse(content)

    // Return the latency value if it exists, otherwise return undefined
    return json.latency || undefined
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File does not exist, return undefined
      return undefined
    }
    throw new Error(
      `Error reading file at ${filePath}: ${
        (error as { message: string }).message
      }`,
    )
  }
}
