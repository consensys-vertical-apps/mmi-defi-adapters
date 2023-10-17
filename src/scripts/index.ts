#!/usr/bin/env node
import { Command } from 'commander'
import 'dotenv/config'
import { DefiAdapter } from '../defi-adapters'
import { blockAverage } from './blockAverage'
import { buildMetadata } from './buildMetadata'
import { buildSnapshots } from './buildSnapshots'
import { buildContractTypes } from './buildTypes'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './newAdapterCommand'

const program = new Command('mmi-adapters')

const defiAdapers = new DefiAdapter()

featureCommands(program, defiAdapers)

newAdapterCommand(program)

blockAverage(program, defiAdapers)

buildContractTypes(program)

buildMetadata(program, defiAdapers)

buildSnapshots(program, defiAdapers)

program.parseAsync()
