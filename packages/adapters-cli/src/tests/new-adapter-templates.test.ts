import { it, expect, describe } from 'vitest'
import type { DefiProvider } from '@metamask-institutional/defi-adapters'
import { QuestionAnswers } from '../templates/questionnaire.js'
import {
  calculateAdapterOutcomes,
  createCode,
} from '../commands/new-adapter-command.js'

function generateAllAnswers(): QuestionAnswers[] {
  const {
    forkCheck,
    erc20Event,
    balanceQueryMethod,
    additionalRewards,
    defiAssetStructure,
    underlyingTokens,
    unwrapOneUnderlying,
    unwrapMultipleUnderlying,
    rewardsDetails,
  } = QuestionAnswers

  const allAnswers: QuestionAnswers[] = []

  for (const forkCheckAnswer of Object.values(forkCheck)) {
    for (const erc20EventAnswer of Object.values(erc20Event)) {
      for (const balanceQueryMethodAnswer of Object.values(
        balanceQueryMethod,
      )) {
        for (const additionalRewardsAnswer of Object.values(
          additionalRewards,
        )) {
          for (const defiAssetStructureAnswer of Object.values(
            defiAssetStructure,
          )) {
            for (const underlyingTokensAnswer of Object.values(
              underlyingTokens,
            )) {
              for (const unwrapOneUnderlyingAnswer of Object.values(
                unwrapOneUnderlying,
              )) {
                for (const unwrapMultipleUnderlyingAnswer of Object.values(
                  unwrapMultipleUnderlying,
                )) {
                  for (const rewardsDetailsAnswer of Object.values(
                    rewardsDetails,
                  )) {
                    allAnswers.push({
                      productId: 'productId',
                      protocolId: 'protocolId',
                      protocolKey: 'productKey',
                      chainKeys: ['Ethereum'],
                      forkCheck: forkCheckAnswer,
                      erc20Event: erc20EventAnswer,
                      balanceQueryMethod: balanceQueryMethodAnswer,
                      additionalRewards: additionalRewardsAnswer,
                      defiAssetStructure: defiAssetStructureAnswer,
                      underlyingTokens: underlyingTokensAnswer,
                      unwrapOneUnderlying: unwrapOneUnderlyingAnswer,
                      unwrapMultipleUnderlying: unwrapMultipleUnderlyingAnswer,
                      rewardsDetails: [rewardsDetailsAnswer],
                    })
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return allAnswers
}

// Run snapshot tests for all possible outcomes
describe('generateAdapter function snapshots', () => {
  generateAllAnswers().forEach((answers, index) => {
    it(`should match snapshot for outcomes ${index}`, async () => {
      const defiProvider = {} as DefiProvider

      const outcomes = calculateAdapterOutcomes(defiProvider, answers!)

      const code: string = await createCode(answers!, outcomes)

      const snapshotData = [answers, outcomes, code]

      expect(snapshotData).toMatchSnapshot()
    })
  })
})
