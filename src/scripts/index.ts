#!/usr/bin/env node
import { Command } from 'commander'
import 'dotenv/config'
import { DefiProvider } from '../defiProvider'
import { blockAverage } from './blockAverage'
import { buildMetadata } from './buildMetadata'
import { buildSnapshots } from './buildSnapshots'
import { buildContractTypes } from './buildTypes'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './newAdapterCommand'

const program = new Command('mmi-adapters')

const defiProvider = new DefiProvider()
const chainProviders = defiProvider.chainProvider.providers

featureCommands(program, defiProvider)

newAdapterCommand(program)

blockAverage(program, chainProviders)

buildContractTypes(program)

buildMetadata(program, chainProviders)

buildSnapshots(program, defiProvider)

program.parseAsync()
