import fs from 'node:fs'
import path from 'node:path'
import { type CodegenConfig, glob, runTypeChain } from 'typechain'

await buildGlobalContractTypes()
await builAdapterContracts()

async function buildGlobalContractTypes() {
  const contractsDirectory = path.resolve(
    'packages/adapters-library/src/contracts/index.js',
  )
  await buildContractTypesForFolder(contractsDirectory)
}

async function builAdapterContracts() {
  const adaptersFolderPath = path.resolve(
    'packages/adapters-library/src/adapters',
  )
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
    target: 'ethers-v6',
    flags: {
      node16Modules: true,
    } as CodegenConfig,
  })

  console.debug(
    { contractsDirectory, allFiles, result },
    'Generated types for contracts',
  )
}
