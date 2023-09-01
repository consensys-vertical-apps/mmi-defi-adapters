#!/usr/bin/env node

import { Command } from 'commander'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './newAdapterCommand'

const program = new Command('mmi-adapters')

featureCommands(program)

newAdapterCommand(program)

program.parseAsync()
