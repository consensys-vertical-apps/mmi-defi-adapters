#!/usr/bin/env node
import { Command } from 'commander'
import { Chain } from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'
import { blockAverage } from './blockAverage'
import { buildMetadata } from './buildMetadata'
import { buildMetadataDb } from './buildMetadataDb'
import { buildSnapshots } from './buildSnapshots'
import { buildContractTypes } from './buildTypes'
import { copyAdapter } from './adapterBuilder/copyAdapter'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './adapterBuilder/newAdapterCommand'
import { performance } from './performance'
import { simulateTxCommand } from './simulateTxCommand'
import { stressCommand } from './stress'

const program = new Command('mmi-adapters')

const defiProvider = new DefiProvider()
const chainProviders = defiProvider.chainProvider.providers
const adaptersController = defiProvider.adaptersController

featureCommands(program, defiProvider)

newAdapterCommand(program, defiProvider)

blockAverage(program, chainProviders)

buildContractTypes(program)

buildMetadata(program, chainProviders, adaptersController)

buildMetadataDb(program, chainProviders, adaptersController)

buildSnapshots(program)

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
      })
    },
  )

program.parseAsync()
