#!/usr/bin/env node

import 'dotenv/config'
import { Command } from 'commander'
import { blockAverage } from './blockAverage'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './newAdapterCommand'

const program = new Command('mmi-adapters')

featureCommands(program)

newAdapterCommand(program)

blockAverage(program)

program.parseAsync()
