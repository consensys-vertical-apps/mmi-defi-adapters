#!/usr/bin/env node
import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'
import { buildIntegrationTests } from './adapterBuilder/buildIntegrationTests'
import { copyAdapter } from './adapterBuilder/copyAdapter'
import { newAdapterCommand } from './adapterBuilder/newAdapterCommand'
import { blockAverage } from './blockAverage'
import { buildMetadataDb } from './buildMetadataDb'
import { buildSnapshots } from './buildSnapshots'
import { buildContractTypes } from './buildTypes'
import { checkDbTotals } from './checkDbTotals'
import { checkMetadataType } from './checkMetadataType'
import { featureCommands } from './featureCommands'
import { performance } from './performance'
import { simulateTxCommand } from './simulateTxCommand'
import { stressCommand } from './stress'

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

program.command('integration-test-restore').action(async () => {
  const allProtocols = await defiProvider.getSupport()

  for (const protocolProducts of Object.values(allProtocols)) {
    for (const product of protocolProducts) {
      const protocolId = product.protocolDetails.protocolId
      const productId = product.protocolDetails.productId

      // if (protocolId !== Protocol.AaveV2) {
      //   continue
      // }

      console.log(
        `Restoring integration tests for ${protocolId} and ${productId}`,
      )

      await buildIntegrationTests({
        protocolId,
        protocolKey: Object.entries(Protocol).find(
          ([_, value]) => value === protocolId,
        )![0],
        productId,
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
})

program.parseAsync()
