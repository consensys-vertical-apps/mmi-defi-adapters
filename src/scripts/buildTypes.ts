import { Command } from 'commander'
import fs from 'fs'
import * as path from 'path'
import { glob, runTypeChain } from 'typechain'
import { logger } from '../core/utils/logger'

export function buildContractTypes(program: Command) {
  program
    .command('build-types')
    .showHelpAfterError()
    .action(async () => {
      await buildGlobalContractTypes()
      await builAdapterContracts()
    })
}

async function buildGlobalContractTypes() {
  const contractsDirectory = path.resolve(__dirname, '../contracts')
  await buildContractTypesForFolder(contractsDirectory)
}

async function builAdapterContracts() {
  const adaptersFolderPath = path.resolve('src/adapters')
  const adaptersFolderEntries = fs.readdirSync(adaptersFolderPath, {
    withFileTypes: true,
  })

  for (const adapterFolderEntry of adaptersFolderEntries) {
    if (!adapterFolderEntry.isDirectory()) {
      continue
    }

    const abisFolder = path.join(
      adaptersFolderPath,
      adapterFolderEntry.name,
      'contracts/abis',
    )
    if (
      !fs.existsSync(abisFolder) ||
      !fs
        .readdirSync(abisFolder, { withFileTypes: true })
        .some((entry) => entry.name.endsWith('.json'))
    ) {
      continue
    }

    await buildContractTypesForFolder(path.resolve(abisFolder, '..'))
  }
}

async function buildContractTypesForFolder(contractsDirectory: string) {
  const allFiles = glob(contractsDirectory, ['**/*.json'])

  const result = await runTypeChain({
    cwd: process.cwd(),
    filesToProcess: allFiles,
    allFiles,
    outDir: contractsDirectory,
    target: 'ethers-v5',
  })

  logger.debug(
    { contractsDirectory, allFiles, result },
    'Generated types for contracts',
  )
}
