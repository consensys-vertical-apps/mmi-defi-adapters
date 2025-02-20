#!/usr/bin/env node
import path from 'node:path'
import {
  ChainName,
  DefiProvider,
  EvmChain,
} from '@metamask-institutional/defi-adapters'
import { buildCachePoolFilter } from '@metamask-institutional/workers'
import { setCloseDatabaseHandlers } from '@metamask-institutional/workers/dist/db-queries.js'
import Database from 'better-sqlite3'
import { Command } from 'commander'
import { buildCacheCommands } from './commands/build-cache-commands.js'
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
import { performanceCommand } from './commands/performance-command.js'
import { buildContractTypes } from './utils/build-types.js'

const program = new Command('defi-adapters')

const cachePoolFilter =
  process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE === 'true'
    ? buildCachePoolFilter(
        Object.values(EvmChain).reduce(
          (acc, chainId) => {
            const db = new Database(
              path.resolve(`databases/${ChainName[chainId]}_index_history.db`),
              {
                readonly: true,
                fileMustExist: true,
                timeout: 5000,
              },
            )

            setCloseDatabaseHandlers(db)

            acc[chainId] = db

            return acc
          },
          {} as Record<EvmChain, Database.Database>,
        ),
      )
    : undefined

const defiProvider = new DefiProvider(
  undefined,
  undefined,
  undefined,
  cachePoolFilter,
)

libraryCommands(program, defiProvider)
buildCacheCommands(program)
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

program.parseAsync()
