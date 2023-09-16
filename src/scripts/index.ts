#!/usr/bin/env node
import { Command } from 'commander'
import 'dotenv/config'
import { blockAverage } from './blockAverage.js'
import { buildMetadata } from './buildMetadata.js'
import { buildContractTypes } from './buildTypes.js'
import { featureCommands } from './featureCommands.js'
import { newAdapterCommand } from './newAdapterCommand.js'

const program = new Command('mmi-adapters')

featureCommands(program)

newAdapterCommand(program)

blockAverage(program)

buildContractTypes(program)

buildMetadata(program)

program.parseAsync()
