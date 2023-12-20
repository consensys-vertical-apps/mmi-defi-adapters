#!/usr/bin/env node
import { Command } from 'commander'
import 'dotenv/config'
import { ethers } from 'ethers'
import { Chain } from '../core/constants/chains'
import { TimePeriod } from '../core/constants/timePeriod'
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
    const addresses = new Array(5).fill(null).map(() => {
      const randomWallet = ethers.Wallet.createRandom()
      return randomWallet.address
    })

    const filterChainIds: Chain[] = [1]

    const blockNumbers = await defiProvider.getStableBlockNumbers(
      filterChainIds,
    )

    const promises = addresses.flatMap((userAddress) => {
      return [
        defiProvider.getPositions({
          userAddress,
          blockNumbers,
          filterChainIds,
        }),
        defiProvider.getProfits({
          userAddress,
          timePeriod: TimePeriod.oneDay,
          toBlockNumbersOverride: blockNumbers,
          filterChainIds,
        }),
        defiProvider.getProfits({
          userAddress,
          timePeriod: TimePeriod.sevenDays,
          toBlockNumbersOverride: blockNumbers,
          filterChainIds,
        }),
        defiProvider.getProfits({
          userAddress,
          timePeriod: TimePeriod.thirtyDays,
          toBlockNumbersOverride: blockNumbers,
          filterChainIds,
        }),
      ]
    })

    await Promise.all(promises)
  })

program.parseAsync()
