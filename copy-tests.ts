import { promises as fs } from 'node:fs'
import path from 'node:path'

async function copyTestsToProducts() {
  const adaptersDir = path.join(
    __dirname,
    'packages/adapters-library/src/adapters',
  )

  try {
    const adapterFolders = await fs.readdir(adaptersDir, {
      withFileTypes: true,
    })

    for (const adapterFolder of adapterFolders) {
      if (adapterFolder.isDirectory()) {
        const adapterPath = path.join(adaptersDir, adapterFolder.name)
        const testsFolderPath = path.join(adapterPath, 'tests')

        // Check if the tests folder exists
        try {
          await fs.access(testsFolderPath)
        } catch (err) {
          console.log(`No tests folder found in ${adapterPath}`)
          continue
        }

        const productsFolder = path.join(adapterPath, 'products')
        const productsFolders = await fs.readdir(productsFolder, {
          withFileTypes: true,
        })

        for (const productFolder of productsFolders) {
          if (productFolder.isDirectory() && productFolder.name !== 'tests') {
            const productPath = path.join(productsFolder, productFolder.name)
            const destinationPath = path.join(productPath, 'tests')

            await copyFolder(testsFolderPath, destinationPath)

            const testCasesProductFile = path.join(
              destinationPath,
              'testCases.ts',
            )

            const fileContent = await fs.readFile(testCasesProductFile, 'utf-8')
            const newContent = fileContent.replace(
              /(\.\.\/){3}/g,
              '../../../../../',
            )
            await fs.writeFile(testCasesProductFile, newContent)

            console.log(`Copied tests folder to ${destinationPath}`)
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading adapter folders:', err)
  }
}

async function copyFolder(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyFolder(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

copyTestsToProducts().catch(console.error)
