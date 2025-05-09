#!/usr/bin/env node
import { DefiProvider } from '@metamask-institutional/defi-adapters'
import { buildPostgresPoolFilter } from '@metamask-institutional/workers'
import { Command } from 'commander'
import { blockAverageCommand } from './commands/block-average-command.js'
import { buildMetadataCommand } from './commands/build-metadata-command.js'
import { buildScoreboardCommand } from './commands/build-scoreboard-command.js'
import { buildSnapshotsCommand } from './commands/build-snapshots-command.js'
import { checkBadSnapshotsCommand } from './commands/check-bad-snapshots-command.js'
import { checkDbTotalsCommand } from './commands/check-db-totals-command.js'
import { checkMetadataTypeCommand } from './commands/check-metadata-type-command.js'
import { copyAdapterCommand } from './commands/copy-adapter-command.js'
import { deleteAdapterMetadataCommand } from './commands/delete-adapters-metadata-command.js'
import { libraryCommands } from './commands/library-commands.js'
import { newAdapterCommand } from './commands/new-adapter-command.js'
import { newMigrationCommand } from './commands/new-migration-command.js'
import { performanceCommand } from './commands/performance-command.js'
import { buildContractTypes } from './utils/build-types.js'

const program = new Command('defi-adapters')

const defiProvider = new DefiProvider({
  poolFilter: buildPoolFilter(),
})

libraryCommands(program, defiProvider)
checkMetadataTypeCommand(program, defiProvider)
buildMetadataCommand(program, defiProvider)
deleteAdapterMetadataCommand(program)
checkDbTotalsCommand(program, defiProvider)
newAdapterCommand(program, defiProvider)
buildContractTypes(program)
performanceCommand(program)
buildSnapshotsCommand(program, defiProvider)
checkBadSnapshotsCommand(program, defiProvider)
copyAdapterCommand(program, defiProvider)
buildScoreboardCommand(program, defiProvider)
blockAverageCommand(program, defiProvider)
newMigrationCommand(program)

program.parseAsync()

function buildPoolFilter() {
  if (process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE !== 'true') {
    return undefined
  }

  if (!process.env.CACHE_DATABASE_URL) {
    throw new Error('CACHE_DATABASE_URL is not set')
  }

  return buildPostgresPoolFilter({
    dbUrl: process.env.CACHE_DATABASE_URL,
  })
}
