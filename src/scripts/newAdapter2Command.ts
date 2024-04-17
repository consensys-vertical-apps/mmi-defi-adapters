import { readFile, writeFile } from 'fs/promises'
import { Command } from 'commander'
import { prompt } from 'inquirer'
import { pascalCase } from '../core/utils/caseConversion'
import { questionsJson } from './template-tracker'
import { compoundV2BorrowMarketForkAdapterTemplate } from './templates/compoundV2BorrowMarketForkAdapter'
import { compoundV2SupplyMarketForkAdapterTemplate } from './templates/compoundV2SupplyMarketForkAdapter'
import { uniswapV2PoolForkAdapterTemplate } from './templates/uniswapV2PoolForkAdapter'
import { votingEscrowAdapterTemplate } from './templates/votingEscrowAdapter'

export interface QuestionConfig {
  question: string
  type: string
  choices?: readonly string[] // Only needed for certain types of questions, e.g., 'list'
  next: Record<string, string> | string
  outcomes?: Record<string, any>
}

export interface Outcomes {
  rewards: 'addRewards' | 'noRewards'
  getPositions: 'useBalanceOfHelper' | 'notImplementedError'
  buildMetadataFunction:
    | 'singleProtocolToken'
    | 'multipleProtocolTokens'
    | 'notImplementedError'
  getPositionsImplementation: 'onePosition' | 'array'
  defiAssetStructure:
    | 'singleProtocolToken'
    | 'multipleProtocolTokens'
    | 'nft'
    | 'contractPosition'
  unwrap: 'useOneToOneMethod' | 'notImplementedError'
  withdrawalsFunction: 'useWithdrawalHelper' | 'notImplementedError'
  depositsFunction: 'useDepositsHelper' | 'notImplementedError'
  forkCheck: 'No' | 'UniswapV2' | 'Convex'
  productId: string
  appId: string
  appName: string
  chainIds: ['Ethereum']
}

// // use if you want to skip questions
// const exampleAnswers: Outcomes = {
//   rewards: true,
//   getPositions: 'useBalanceOfHelper' as 'useBalanceOfHelper',
//   buildMetadataFunction: 'singleProtocolToken' as 'singleProtocolToken',
//   getPositionsImplementation: 'array' as 'array',
//   withdrawalsFunction: 'useWithdrawalHelper' as 'useWithdrawalHelper',
//   depositsFunction: 'useDepositsHelper' as 'useDepositsHelper',
//   forkCheck: 'UniswapV2' as 'UniswapV2',
//   productId: 'defi-product',
//   appId: 'app-id',
//   appName: 'MyDeFiApp',
//   chainIds: ['Ethereum'],
// }

async function initiateQuestionnaire() {
  const createAdapterAnswers: Record<string, any> = {}

  await askQuestion('appName', createAdapterAnswers)

  console.log('End of questionnaire', createAdapterAnswers.outcomes)

  console.log('End of questionnaire')

  console.log('AAAAAAAAAAAAAAAAAAAAA', createAdapterAnswers.outcomes.template)

  switch (createAdapterAnswers.outcomes.template) {
    case 'UniswapV2': {
      const code = uniswapV2PoolForkAdapterTemplate({
        protocolKey: createAdapterAnswers.outcomes.appName,
        productId: createAdapterAnswers.outcomes.productId,
        adapterClassName: `${createAdapterAnswers.outcomes.appName}${pascalCase(
          createAdapterAnswers.outcomes.productId,
        )}Adapter`,
        chainKeys: createAdapterAnswers.outcomes.chainIds, // TODO Rename to chainKeys
      })

      await writeFile('src/scripts/generatedCode.ts', code)
      break
    }
    case 'CurveGovernanceVesting': {
      const code = votingEscrowAdapterTemplate({
        protocolKey: createAdapterAnswers.outcomes.appName,
        productId: createAdapterAnswers.outcomes.productId,
        adapterClassName: `${createAdapterAnswers.outcomes.appName}${pascalCase(
          createAdapterAnswers.outcomes.productId,
        )}Adapter`,
      })

      await writeFile('src/scripts/generatedCode.ts', code)
      break
    }
    case 'CompoundV2': {
      const supplyMarketCode = compoundV2SupplyMarketForkAdapterTemplate({
        protocolKey: createAdapterAnswers.outcomes.appName,
        productId: createAdapterAnswers.outcomes.productId,
        adapterClassName: `${createAdapterAnswers.outcomes.appName}${pascalCase(
          createAdapterAnswers.outcomes.productId,
        )}Adapter`,
      })

      await writeFile('src/scripts/generatedCodeSupply.ts', supplyMarketCode)

      const borrowMarketCode = compoundV2BorrowMarketForkAdapterTemplate({
        protocolKey: createAdapterAnswers.outcomes.appName,
        productId: createAdapterAnswers.outcomes.productId,
        adapterClassName: `${createAdapterAnswers.outcomes.appName}${pascalCase(
          createAdapterAnswers.outcomes.productId,
        )}Adapter`,
      })

      await writeFile('src/scripts/generatedCodeBorrow.ts', borrowMarketCode)

      break
    }
    default: {
      const blankTemplate = await readBlankTemplate(
        'src/scripts/blankAdapter.ts',
      )

      const code = generateCode(createAdapterAnswers.outcomes, blankTemplate!)

      await writeFile('src/scripts/generatedCode.ts', code)
    }
  }

  console.log('The file has been saved!')
}

async function askQuestion(
  key: keyof typeof questionsJson,
  createAdapterAnswers: Record<string, any>,
) {
  const questionConfig: QuestionConfig = questionsJson[key]

  const answers = await prompt([
    {
      type: questionConfig.type,
      name: key,
      message: questionConfig.question,
      choices: questionConfig.choices,
    },
  ])
  const answer = answers[key]

  const hasOutcomes = questionConfig.outcomes

  createAdapterAnswers[key] = answer

  if (hasOutcomes) {
    createAdapterAnswers['outcomes'] = {
      ...questionConfig.outcomes![answer],
      ...createAdapterAnswers['outcomes'],
    }
  } else {
    createAdapterAnswers['outcomes'] = {
      [key]: answer,
      ...createAdapterAnswers['outcomes'],
    }
  }

  if (
    questionConfig.next === 'end' ||
    (questionConfig.next as Record<string, string>)[answer] === 'end'
  ) {
    return answers.outcomes
  }

  //@ts-ignore
  const nextQuestion = questionConfig.next[answer] || questionConfig.next
  await askQuestion(nextQuestion, createAdapterAnswers)
}

export function newAdapter2Command(program: Command) {
  program
    .command('new-adapter2')
    .description('Start the interactive CLI questionnaire')
    .action(initiateQuestionnaire)
}

async function readBlankTemplate(filePath: string) {
  return readFile(filePath, { encoding: 'utf8' })
}

function generateCode(answers: Outcomes, defaultTemplate: string): string {
  let updatedTemplate = defaultTemplate
    .replace(/adapterClassName/g, answers.appName)
    .replace(/{{appName}}/g, answers.appName)
    .replace(/{{appId}}/g, answers.appId)
    .replace(/{{productId}}/g, answers.productId)

  if (answers.unwrap) {
    const replace = /return '{{unwrap}}' as any/g

    switch (answers.unwrap) {
      case 'useOneToOneMethod':
        updatedTemplate = updatedTemplate.replace(
          replace,
          `return helpers.unwrapOneToOne({
            protocolToken: await this.getProtocolToken(_input.protocolTokenAddress),
            underlyingTokens: await this.getUnderlyingTokens(_input.protocolTokenAddress)
          })`,
        )
        break
      default:
        updatedTemplate = updatedTemplate.replace(
          replace,
          'throw new NotImplementedError()',
        )
        break
    }
  }

  if (answers.getPositions && answers.defiAssetStructure) {
    const replace = /return '{{getPositions}}' as any/g

    switch (`${answers.getPositions}_${answers.defiAssetStructure}`) {
      case 'useBalanceOfHelper_singleProtocolToken':
      case 'useBalanceOfHelper_multipleProtocolTokens':
        updatedTemplate = updatedTemplate.replace(
          replace,
          `return helpers.getBalanceOfTokens({
            ..._input,
            protocolTokens: await this.getProtocolTokens(),
            provider: this.provider
          })`,
        )
        break
      default:
        updatedTemplate = updatedTemplate.replace(
          replace,
          'throw new NotImplementedError()',
        )
        break
    }
  }

  if (answers.buildMetadataFunction && answers.getPositionsImplementation) {
    const regex = /return '{{buildMetadata}}' as unknown as Metadata/g

    switch (
      `${answers.buildMetadataFunction}_${answers.getPositionsImplementation}`
    ) {
      case 'hardCoded_onePosition':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `return {protocolToken : helpers.getTokenMetadata() , underlyingToken : helpers.getTokenMetadata()}`,
        )
        break
      case 'hardCoded_array':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `return{protocolToken : helpers.getTokenMetadata() , underlyingTokens : [helpers.getTokenMetadata(), helpers.getTokenMetadata()]}`,
        )
        break
      case 'factory_onePosition':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `return {protocolToken : helpers.getTokenMetadata() , underlyingTokens : [helpers.getTokenMetadata(), helpers.getTokenMetadata()]}`, // needs updating
        )
        break
      case 'factory_array':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `return {protocolToken : helpers.getTokenMetadata() , underlyingTokens : [helpers.getTokenMetadata(), helpers.getTokenMetadata()]}`, // needs updating
        )
        break
      default:
        updatedTemplate = updatedTemplate.replace(
          regex,
          'throw new NotImplementedError()',
        )
        break
    }
  }

  if (answers.withdrawalsFunction && answers.depositsFunction) {
    const regexWithdrawals = /return '{{getWithdrawals}}' as any/g
    const regexDeposits = /return '{{getDeposits}}' as any/g

    switch (`${answers.withdrawalsFunction}_${answers.depositsFunction}`) {
      case 'useWithdrawalHelper_useDepositsHelper':
        updatedTemplate = updatedTemplate.replace(
          regexWithdrawals,
          `return helpers.withdrawals({
            protocolToken: await this.getProtocolToken(protocolTokenAddress),
            filter: { fromBlock, toBlock, userAddress },
            provider: this.provider,
          })`,
        )
        updatedTemplate = updatedTemplate.replace(
          regexDeposits,
          `return helpers.deposits({
            protocolToken: await this.getProtocolToken(protocolTokenAddress),
            filter: { fromBlock, toBlock, userAddress },
            provider: this.provider,
          })`,
        )
        break
      default:
        updatedTemplate = updatedTemplate.replace(
          regexWithdrawals,
          'throw new NotImplementedError()',
        )
        updatedTemplate = updatedTemplate.replace(
          regexDeposits,
          'throw new NotImplementedError()',
        )
        break
    }
  }

  const regexRewardPositions = /\/\/getRewardPositions/g
  const regexRewardWithdrawals = /\/\/getRewardWithdrawals/g
  const regexGetPositionsFunctionName = /getPositions/g
  const regexGetWithdrawalsFunctionName = /getWithdrawals/g
  switch (answers.rewards) {
    case 'addRewards':
      updatedTemplate = updatedTemplate.replace(
        regexGetPositionsFunctionName,
        `getPositionsWithoutRewards`,
      )
      updatedTemplate = updatedTemplate.replace(
        /implements/g,
        `extends RewardsAdapter implements`,
      )
      updatedTemplate = updatedTemplate.replace(
        /this.provider = provider/g,
        `super()
        this.provider = provider`,
      )

      updatedTemplate = updatedTemplate.replace(
        regexRewardPositions,
        `async getRewardPositions({
          userAddress,
          protocolTokenAddress,
          blockNumber,
        }: {
          userAddress: string
          blockNumber?: number
          protocolTokenAddress: string
        }): Promise<Underlying[]> {
          throw new NotImplementedError()
        }`,
      )

      updatedTemplate = updatedTemplate.replace(
        regexGetWithdrawalsFunctionName,
        `getWithdrawalsWithoutRewards`,
      )
      updatedTemplate = updatedTemplate.replace(
        regexRewardWithdrawals,
        `async getRewardWithdrawals({
          userAddress,
          protocolTokenAddress,
        }: GetEventsInput): Promise<MovementsByBlock[]> {
          throw new NotImplementedError()
        }`,
      )

      break
    default:
      updatedTemplate = updatedTemplate.replace(regexRewardPositions, '')
      updatedTemplate = updatedTemplate.replace(regexRewardWithdrawals, '')
      break
  }

  return updatedTemplate
}
