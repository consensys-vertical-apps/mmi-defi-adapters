#!/usr/bin/env node
import { Command } from 'commander'
import { blockAverageCommand } from './commands/block-average-command.ts'
import { buildMetadataCommand } from './commands/build-metadata-command.ts'
import { buildScoreboardCommand } from './commands/build-scoreboard-command.ts'
import { buildSnapshotsCommand } from './commands/build-snapshots-command.ts'
import { checkBadSnapshotsCommand } from './commands/check-bad-snapshots-command.ts'
import { checkDbTotalsCommand } from './commands/check-db-totals-command.ts'
import { checkMetadataTypeCommand } from './commands/check-metadata-type-command.ts'
import { copyAdapterCommand } from './commands/copy-adapter-command.ts'
import { deleteAdapterMetadataCommand } from './commands/delete-adapters-metadata-command.ts'
import { libraryCommands } from './commands/library-commands.ts'
import { newAdapterCommand } from './commands/new-adapter-command.ts'
import { newMigrationCommand } from './commands/new-migration-command.ts'
import { performanceCommand } from './commands/performance-command.ts'
import { buildContractTypes } from './utils/build-types.ts'

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
