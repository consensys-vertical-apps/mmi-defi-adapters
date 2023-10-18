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

const defiAdapter = new DefiProvider()
const chainProviders = defiAdapter.chainProvider.providers

featureCommands(program, defiAdapter)

newAdapterCommand(program)

blockAverage(program, chainProviders)

buildContractTypes(program)

buildMetadata(program, chainProviders)

buildSnapshots(program, defiAdapter)

program.parseAsync()
