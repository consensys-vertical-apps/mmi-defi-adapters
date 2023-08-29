#!/usr/bin/env node

import { Command } from 'commander'
import { addFeatureCommands } from './features'
import { addNewAdapterCommand } from './new-adapter'

const program = new Command('mmi-adapters')

addFeatureCommands(program)

addNewAdapterCommand(program)

program.parseAsync()
