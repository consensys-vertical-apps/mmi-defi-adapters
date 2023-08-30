#!/usr/bin/env node

import { Command } from 'commander'
import { featureCommands } from './featureCommands'
import { addNewAdapterCommand } from './new-adapter'

const program = new Command('mmi-adapters')

featureCommands(program)

addNewAdapterCommand(program)

program.parseAsync()
