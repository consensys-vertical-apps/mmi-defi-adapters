#!/usr/bin/env node
import { Command } from 'commander'
import 'dotenv/config'
import { blockAverage } from './blockAverage'
import { buildMetadata } from './buildMetadata'
import { buildSnapshots } from './buildSnapshots'
import { buildContractTypes } from './buildTypes'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './newAdapterCommand'

const program = new Command('mmi-adapters')

featureCommands(program)

newAdapterCommand(program)

blockAverage(program)

buildContractTypes(program)

buildMetadata(program)

buildSnapshots(program)

program.parseAsync()
