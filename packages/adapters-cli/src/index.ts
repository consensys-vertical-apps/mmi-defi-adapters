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

libraryCommands(program)
checkMetadataTypeCommand(program)
buildMetadataCommand(program)
deleteAdapterMetadataCommand(program)
checkDbTotalsCommand(program)
newAdapterCommand(program)
buildContractTypes(program)
performanceCommand(program)
buildSnapshotsCommand(program)
checkBadSnapshotsCommand(program)
copyAdapterCommand(program)
buildScoreboardCommand(program)
blockAverageCommand(program)
newMigrationCommand(program)

program.parseAsync()
