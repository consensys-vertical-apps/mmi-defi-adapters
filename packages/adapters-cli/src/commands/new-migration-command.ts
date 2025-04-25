import fs from 'node:fs/promises'
import path from 'node:path'
import { Command } from 'commander'
import { kebabCase } from 'lodash-es'
import { writeAndLintFile } from '../utils/write-and-lint-file.js'
export function newMigrationCommand(program: Command) {
  program
    .command('new-migration')
    .argument('[migrationName]', 'Name of the migration')
    .showHelpAfterError()
    .action(async (migrationName: string) => {
      const lastMigration = (
        await fs.readdir(
          path.join(import.meta.dirname, '../../../workers/src/migrations'),
        )
      )
        .filter((file) => /^\d{4}-.+\.ts$/.test(file))
        .sort()
        .reverse()[0]!

      const nextMigrationNumber = Number(lastMigration.slice(0, 4)) + 1
      const nextMigrationFileName = `${nextMigrationNumber.toString().padStart(4, '0')}-${kebabCase(migrationName)}`

      await writeAndLintFile(
        `./packages/workers/src/migrations/${nextMigrationFileName}.ts`,
        `
        import type { Pool } from 'pg'

        export default async function (client: Pool) {
          // Implement migration logic here
        }
        `,
      )

      process.exit()
    })
}
