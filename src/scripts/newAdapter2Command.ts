import { Command } from 'commander'
import { prompt } from 'inquirer'
import { types } from 'recast'
import { questionsJson } from './template-tracker'
import { writeFile } from 'fs'
import { readFile } from 'fs/promises'
import { promisify } from 'util'

const n = types.namedTypes
const b = types.builders

export interface QuestionConfig {
  question: string
  type: string
  choices?: string[] // Only needed for certain types of questions, e.g., 'list'
  next: Record<string, string> | string
  outcomes?: Record<string, any>
}

export interface Outcomes {
  rewards: boolean
  getPositions: 'useBalanceOfHelper' | 'notImplemented'
  buildMetadataFunction: 'hardCoded' | 'factory' | 'notImplemented'
  getPositionsImplementation: 'onePosition' | 'array'
  withdrawalsFunction: 'useWithdrawalHelper' | 'notImplemented'
  depositsFunction: 'useDepositsHelper' | 'notImplemented'
  forkCheck: 'No' | 'UniswapV2' | 'Convex'
  productId: string
  appId: string
  appName: string
  chainIds: ['Ethereum']
}

const exampleAnswers: Outcomes = {
  rewards: true,
  getPositions: 'useBalanceOfHelper' as 'useBalanceOfHelper',
  buildMetadataFunction: 'factory' as 'factory',
  getPositionsImplementation: 'array' as 'array',
  withdrawalsFunction: 'useWithdrawalHelper' as 'useWithdrawalHelper',
  depositsFunction: 'useDepositsHelper' as 'useDepositsHelper',
  forkCheck: 'UniswapV2' as 'UniswapV2',
  productId: 'defi-product',
  appId: 'app-id',
  appName: 'My DeFi App',
  chainIds: ['Ethereum'],
}

async function initiateQuestionnaire() {
  const createAdapterAnswers: Record<string, any> = {}

  // await askQuestion('appName', createAdapterAnswers)

  console.log('End of questionnaire', createAdapterAnswers.outcomes)

  console.log('End of questionnaire')

  const defaultTemplate = await readBlankTemplate('src/scripts/blankAdapter.ts')

  const code = await generateCode(exampleAnswers, defaultTemplate!)

  const writeFileAsync = promisify(writeFile)

  await writeFileAsync('../../src/scripts/generatedCode.ts', code)
  console.log('The file has been saved!')
  // writeFile('./generatedCode.ts', code, (err) => {
  //   if (err) throw err
  //   console.log('The file has been saved!')
  // })
}

async function askQuestion(
  key: string,
  createAdapterAnswers: Record<string, any>,
) {
  const questionConfig = questionsJson[key] as QuestionConfig
  if (!questionConfig) {
    console.log(
      'Question not found, ending questionnaire.',
      createAdapterAnswers,
    )
    return
  }

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

  if (questionConfig.next === 'end') {
    return
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

  if (answers.getPositions && answers.getPositionsImplementation) {
    const replace = /return '{{getPositions}}' as any/g

    switch (`${answers.getPositions}_${answers.getPositionsImplementation}`) {
      case 'useBalanceOfHelper_onePosition':
        updatedTemplate = updatedTemplate.replace(
          replace,
          'helper.getBalanceOfTokens()',
        )
        break
      case 'useBalanceOfHelper_array':
        updatedTemplate = updatedTemplate.replace(
          replace,
          'helper.getBalanceOfToken()',
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
    switch (
      `${answers.buildMetadataFunction}_${answers.getPositionsImplementation}`
    ) {
      case 'hardCoded_onePosition':
        updatedTemplate = updatedTemplate.replace(
          /return '{{buildMetadata}}' as any/g,
          `const metadata = {protocolToken : helper.getTokenMetadata() , underlyingToken : helper.getTokenMetadata()}`,
        )
        break
      case 'hardCoded_array':
        updatedTemplate = updatedTemplate.replace(
          /return '{{buildMetadata}}' as any/g,
          `const metadata = {protocolToken : helper.getTokenMetadata() , underlyingTokens : [helper.getTokenMetadata(), helper.getTokenMetadata()]}`,
        )
        break
      case 'factory_onePosition':
        updatedTemplate = updatedTemplate.replace(
          /return '{{buildMetadata}}' as any/g,
          `const metadata = {protocolToken : helper.getTokenMetadata() , underlyingTokens : [helper.getTokenMetadata(), helper.getTokenMetadata()]}`, // needs updating
        )
        break
      case 'factory_array':
        updatedTemplate = updatedTemplate.replace(
          /return '{{buildMetadata}}' as any/g,
          `const metadata = {protocolToken : helper.getTokenMetadata() , underlyingTokens : [helper.getTokenMetadata(), helper.getTokenMetadata()]}`, // needs updating
        )
        break
      default:
        updatedTemplate = updatedTemplate.replace(
          /return '{{buildMetadata}}' as any/g,
          'throw new NotImplementedError()',
        )
        break
    }
  }

  return updatedTemplate
}
