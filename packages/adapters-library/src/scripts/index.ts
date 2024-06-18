#!/usr/bin/env node
import { Command } from 'commander'
import { DefiProvider } from '../defiProvider'
import { blockAverage } from './blockAverage'
import { buildMetadata } from './buildMetadata'
import { buildSnapshots } from './buildSnapshots'
import { buildContractTypes } from './buildTypes'
import { copyAdapter } from './copyAdapter'
import { featureCommands } from './featureCommands'
import { newAdapter2Command } from './newAdapter2Command'
import { newAdapterCommand } from './newAdapterCommand'
import { performance } from './performance'
import { simulateTxCommand } from './simulateTxCommand'
import { stressCommand } from './stress'

const program = new Command('mmi-adapters')

const defiProvider = new DefiProvider()
const chainProviders = defiProvider.chainProvider.providers
const adaptersController = defiProvider.adaptersController

featureCommands(program, defiProvider)

newAdapterCommand(program, defiProvider)

newAdapter2Command(program, defiProvider)

blockAverage(program, chainProviders)

buildContractTypes(program)

buildMetadata(program, chainProviders, adaptersController)

buildSnapshots(program, defiProvider)

stressCommand(program, defiProvider)

simulateTxCommand(program, chainProviders)

performance(program)

program
  .command('copy-adapter')
  .argument('[sourceProtocolId]', 'Protocol to copy')
  .argument('[sourceProductId]', 'Product to copy')
  .action(async (sourceProtocolId, sourceProductId) => {
    await copyAdapter({
      protocolKey: 'NewProtocol',
      protocolId: 'new-protocol',
      productId: 'new-product',
      chainKeys: ['Ethereum'],
      sourceProtocolId: sourceProtocolId,
      sourceProductId: sourceProductId,
    })
  })

program.parseAsync()
