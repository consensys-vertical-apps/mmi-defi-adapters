#!/usr/bin/env node

import { Command } from 'commander'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './newAdapterCommand'
import { buildContractTypes } from './buildTypes'
import { buildMetadata } from './buildMetadata'

const program = new Command('mmi-adapters')

featureCommands(program)

newAdapterCommand(program)

buildContractTypes(program)

buildMetadata(program)

program.parseAsync()
