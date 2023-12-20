#!/usr/bin/env node
import { Command } from 'commander'
import 'dotenv/config'
import { TimePeriod } from '../core/constants/timePeriod'
import { DefiProvider } from '../defiProvider'
import { blockAverage } from './blockAverage'
import { buildMetadata } from './buildMetadata'
import { buildSnapshots } from './buildSnapshots'
import { buildContractTypes } from './buildTypes'
import { featureCommands } from './featureCommands'
import { newAdapterCommand } from './newAdapterCommand'
import { ethers } from 'ethers'

const program = new Command('mmi-adapters')

const defiProvider = new DefiProvider()
const chainProviders = defiProvider.chainProvider.providers
const adaptersController = defiProvider.adaptersController

featureCommands(program, defiProvider)

newAdapterCommand(program, defiProvider)

blockAverage(program, chainProviders)

buildContractTypes(program)

buildMetadata(program, chainProviders, adaptersController)

buildSnapshots(program, defiProvider)

program
  .command('stress')
  .showHelpAfterError()
  .action(async () => {
    const addresses = new Array(5).fill(null).map((_, index) => {
      const randomWallet = ethers.Wallet.createRandom()
      return randomWallet.address
    })

    const blockNumbers = await defiProvider.getStableBlockNumbers([1])

    const promises = addresses.flatMap((userAddress) => {
      return [
        defiProvider.getPositions({
          userAddress,
          blockNumbers,
          filterChainIds: [1],
        }),
        defiProvider.getProfits({
          userAddress,
          timePeriod: TimePeriod.oneDay,
          toBlockNumbersOverride: blockNumbers,
          filterChainIds: [1],
        }),
        defiProvider.getProfits({
          userAddress,
          timePeriod: TimePeriod.sevenDays,
          toBlockNumbersOverride: blockNumbers,
          filterChainIds: [1],
        }),
        defiProvider.getProfits({
          userAddress,
          timePeriod: TimePeriod.thirtyDays,
          toBlockNumbersOverride: blockNumbers,
          filterChainIds: [1],
        }),
      ]
    })

    await Promise.all(promises)
  })

program.parseAsync()
