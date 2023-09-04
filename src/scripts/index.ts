#!/usr/bin/env node

import { Command } from 'commander'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './newAdapterCommand'
import { buildContractTypes } from './buildTypes'

const program = new Command('mmi-adapters')

featureCommands(program)

newAdapterCommand(program)

buildContractTypes(program)

program.parseAsync()
