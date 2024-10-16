#!/usr/bin/env node
import { Command } from 'commander'
import type { Chain } from '../core/constants/chains.js'
import { DefiProvider } from '../defiProvider.js'
import { copyAdapter } from './adapterBuilder/copyAdapter.js'
import { newAdapterCommand } from './adapterBuilder/newAdapterCommand.js'
import { blockAverage } from './blockAverage.js'
import { buildMetadataDb } from './buildMetadataDb.js'
import { buildSnapshots } from './buildSnapshots.js'
import { buildContractTypes } from './buildTypes.js'
import { checkBadSnapshots } from './checkBadSnapshots.js'
import { checkDbTotals } from './checkDbTotals.js'
import { checkMetadataType } from './checkMetadataType.js'
import { featureCommands } from './featureCommands.js'
import { performance } from './performance.js'
import { simulateTxCommand } from './simulateTxCommand.js'
import { stressCommand } from './stress.js'

const program = new Command('mmi-adapters')

const defiProvider = new DefiProvider()
const chainProviders = defiProvider.chainProvider.providers
const adaptersController = defiProvider.adaptersController

featureCommands(program, defiProvider)

checkMetadataType(program, chainProviders, adaptersController)

newAdapterCommand(program, defiProvider)

blockAverage(program, chainProviders)

buildContractTypes(program)

buildMetadataDb(program, chainProviders, adaptersController)

checkDbTotals(program, chainProviders, adaptersController)

buildSnapshots(program, defiProvider)

checkBadSnapshots(program, defiProvider)

stressCommand(program, defiProvider)

simulateTxCommand(program, chainProviders)

performance(program)

program
  .command('copy-adapter')
  .argument('[sourceProtocolId]', 'Protocol to copy')
  .argument('[newProtocolId]', 'New protocol id (kebab-case)')
  .argument('[newProtocolKey]', 'New protocol Key (PascalCase)')
  .argument(
    '[chainKeys]',
    'List of chain keys to copy (e.g. Ethereum,Arbitrum,Linea',
  )
  .action(
    async (sourceProtocolId, newProtocolId, newProtocolKey, chainKeys) => {
      await copyAdapter({
        protocolKey: newProtocolKey,
        protocolId: newProtocolId,
        chainKeys: chainKeys.split(',') as (keyof typeof Chain)[],
        sourceProtocolId: sourceProtocolId,
        defiProvider,
      })
    },
  )

program.parseAsync()
