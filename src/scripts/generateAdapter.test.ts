import { generateAdapter } from './generateAdapter'
import { Answers, Outcomes, readBlankTemplate } from './newAdapter2Command'

// Helper function to generate all possible combinations of Outcomes
function generateAllOutcomes(): Outcomes[] {
  // Define all possible values for each property in Outcomes
  const rewardsValues: Outcomes['rewards'][] = ['addRewards', 'noRewards']
  const getPositionsValues: Outcomes['getPositions'][] = [
    'useBalanceOfHelper',
    'notImplementedError',
  ]
  const buildMetadataFunctionValues: Outcomes['buildMetadataFunction'][] = [
    'singleProtocolToken',
    'multipleProtocolTokens',
    'notImplementedError',
  ]
  const underlyingTokensValues: Outcomes['underlyingTokens'][] = [
    'oneUnderlying',
    'multipleUnderlying',
  ]
  const defiAssetStructureValues: Outcomes['defiAssetStructure'][] = [
    'singleProtocolToken',
    'multipleProtocolTokens',
    'nft',
    'contractPosition',
  ]
  const unwrapValues: Outcomes['unwrap'][] = [
    'useOneToOneMethod',
    'notImplementedError',
  ]
  const withdrawalsFunctionValues: Outcomes['withdrawalsFunction'][] = [
    'useWithdrawalHelper',
    'notImplementedError',
  ]
  const depositsFunctionValues: Outcomes['depositsFunction'][] = [
    'useDepositsHelper',
    'notImplementedError',
  ]
  const templateValues: Outcomes['template'][] = ['No']

  // Generate all possible combinations using nested loops
  const allOutcomes: Outcomes[] = []

  rewardsValues.forEach((rewards) => {
    getPositionsValues.forEach((getPositions) => {
      buildMetadataFunctionValues.forEach((buildMetadataFunction) => {
        underlyingTokensValues.forEach((underlyingTokens) => {
          defiAssetStructureValues.forEach((defiAssetStructure) => {
            unwrapValues.forEach((unwrap) => {
              withdrawalsFunctionValues.forEach((withdrawalsFunction) => {
                depositsFunctionValues.forEach((depositsFunction) => {
                  templateValues.forEach((template) => {
                    allOutcomes.push({
                      rewards,
                      getPositions,
                      buildMetadataFunction,
                      underlyingTokens,
                      defiAssetStructure,
                      unwrap,
                      withdrawalsFunction,
                      depositsFunction,
                      template,
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  return allOutcomes
}

// Run snapshot tests for all possible outcomes
describe('generateAdapter function snapshots', () => {
  const answers = {
    protocolId: 'testProtocolId',
    productId: 'testProductId',
    protocolKey: 'testProductKey',
    chainKeys: ['Ethereum'],
    forkCheck: 'no',
    erc20Event: '',
    balanceQueryMethod: '',
    unwrapSimpleMapping: '',
    additionalRewards: '',
  }

  generateAllOutcomes().forEach((outcomes, index) => {
    it(`should match snapshot for outcomes ${index}`, async () => {
      const blankTemplate = await readBlankTemplate(
        'src/adapters/blank/blankTemplate/blankAdapterForCli/blankAdapter.ts',
      )
      const generatedAdapter = generateAdapter(
        answers as unknown as Answers,
        outcomes,
        blankTemplate,
      )

      const snapshotData = [outcomes, generatedAdapter]

      expect(snapshotData).toMatchSnapshot()
    })
  })
})
