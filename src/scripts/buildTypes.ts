import path from 'path'
import { glob, runTypeChain } from 'typechain'
import { logger } from '../core/utils/logger'

export const main = async () => {
  const cwd = process.cwd()
  const contractsDirectory = path.resolve(__dirname, '../contracts')

  const allFiles = glob(contractsDirectory, ['**/*.json'])

  const result = await runTypeChain({
    cwd,
    filesToProcess: allFiles,
    allFiles,
    outDir: contractsDirectory,
    target: 'ethers-v5',
  })

  logger.debug({ allFiles, result }, 'Generated types for contracts')
}

main()
