import { readFile, writeFile } from 'fs/promises'
import { Command } from 'commander'
import { prompt } from 'inquirer'
import { lowerFirst, pascalCase } from '../core/utils/caseConversion'
import { questionsJson } from './questionnaire'
import { compoundV2BorrowMarketForkAdapterTemplate } from './templates/compoundV2BorrowMarketForkAdapter'
import { compoundV2SupplyMarketForkAdapterTemplate } from './templates/compoundV2SupplyMarketForkAdapter'
import { uniswapV2PoolForkAdapterTemplate } from './templates/uniswapV2PoolForkAdapter'
import { votingEscrowAdapterTemplate } from './templates/votingEscrowAdapter'
import { Chain } from '../core/constants/chains'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import path from 'path'
import {
  buildIntegrationTests,
  addProtocol,
  exportAdapter,
  NewAdapterAnswers,
} from './newAdapterCommand'
import { Erc20Metadata } from '../types/erc20Metadata'
import chalk from 'chalk'
import { Replacements } from './replacements'

const colorReset = '\x1b[0m'
const colorBlue = '\x1b[38;2;0;112;243m'
const styleBold = '\x1b[1m'

export interface QuestionConfig {
  question: string
  type: string
  choices?: readonly string[] // Only needed for certain types of questions, e.g., 'list'
  next: Record<string, string> | string
  //eslint-disable-next-line
  outcomes?: Record<string, any>
  validate?: (input: string) => boolean | string
  suffix?: string
  default?: any
}

export type Outcomes = {
  rewards: 'addRewards' | 'noRewards'
  getPositions: 'useBalanceOfHelper' | 'notImplementedError'
  buildMetadataFunction:
    | 'singleProtocolToken'
    | 'multipleProtocolTokens'
    | 'notImplementedError'
  underlyingTokens: 'oneUnderlying' | 'multipleUnderlying'
  defiAssetStructure:
    | 'singleProtocolToken'
    | 'multipleProtocolTokens'
    | 'nft'
    | 'contractPosition'
  unwrap: 'useOneToOneMethod' | 'notImplementedError'
  withdrawalsFunction: 'useWithdrawalHelper' | 'notImplementedError'
  depositsFunction: 'useDepositsHelper' | 'notImplementedError'
  template: 'CompoundV2' | 'CurveGovernanceVesting' | 'UniswapV2'
}

type Answers = Record<keyof typeof questionsJson, string> & {
  chainKeys: (keyof typeof Chain)[]
  adapterClassName: string
}

async function initiateQuestionnaire() {
  console.log(
    colorBlue +
      styleBold +
      `                                                                        
                                                                        
                                                                        
                                                                        
                                                                        
                                                                        
                                                                        
                                                                        
                                                                        
      +-.                                .-+                 
     -###*==:                        :-=*#%#=                
     #######+====-              :====+#######.               
    *#########*+====..........====+*#########*               
    :############+==-........-==+############:               
     ##############*=:......:=*##############                
     =###############+......+###############=                
     +#############*==......==*#############+                
     -###########*====......====*###########-                
     .#######+--======:....:======-:=#######.                
       --:....-=======:....:=======-.....--                  
       ......-+****+++-....-++++****-......                  
      ........:+***##*-....-*##***+-........                 
      .........:=-+%@*=....=*%%*-=:.........                 
     ...........-....:-....-:....-...........                
     ========++++-....-....-....-++++========                
     :=======+**+===:........:===+**+=======-                
      ========+*+===--@@@@@@--===+*=========.                
      :==========:...=@@@@@@=...:==========-                 
       ==-:.      ....:::::::...      .:-==                  
                     .::::::.                                
                                                             
                                                             
                                                             
                                                             
            Create new DeFi Adapter!                                              
                                                             
                                                             
                                                             
                                                             ` +
      colorReset,
  )

  const firstQuestionId = 'protocolKey'

  const [answers, outcomes] = await askQuestion(firstQuestionId)

  // create adapter class name
  answers.adapterClassName = adapterClassName(
    answers.protocolKey,
    answers.productId,
  )

  switch (outcomes.template) {
    case 'UniswapV2': {
      const code = uniswapV2PoolForkAdapterTemplate({
        protocolKey: answers.protocolId,
        productId: answers.productId,
        adapterClassName: answers.adapterClassName,
        chainKeys: answers.chainKeys, // TODO Rename to chainKeys
      })

      await createAdapterFile(answers, code)
      break
    }
    case 'CurveGovernanceVesting': {
      const code = votingEscrowAdapterTemplate({
        protocolKey: answers.protocolId,
        productId: answers.productId,
        adapterClassName: answers.adapterClassName,
      })

      await createAdapterFile(answers, code)
      break
    }
    case 'CompoundV2': {
      const supplyMarketCode = compoundV2SupplyMarketForkAdapterTemplate({
        protocolKey: answers.protocolId,
        productId: answers.productId,
        adapterClassName: answers.adapterClassName,
      })

      await createAdapterFile(answers, supplyMarketCode)

      const borrowMarketCode = compoundV2BorrowMarketForkAdapterTemplate({
        protocolKey: answers.protocolId,
        productId: answers.productId,
        adapterClassName: answers.adapterClassName,
      })

      await createAdapterFile(answers, borrowMarketCode)

      break
    }
    default:
      {
        await buildAdapterFromBlankTemplate(answers, outcomes)
      }

      await buildIntegrationTests(answers)
      await addProtocol(answers)
      await exportAdapter(answers)

      console.log(
        chalk`\n{bold New adapter created at: {bgBlack.red src/adapters/${
          answers.protocolId
        }/products/${answers.productId}/${lowerFirst(
          answers.adapterClassName,
        )}.ts}}\n`,
      )
  }

  console.log('The file has been saved!')
}

async function askQuestion(
  key: keyof typeof questionsJson,
  answers = {} as Answers,
  outcomes = {} as Outcomes,
): Promise<[Answers, Outcomes]> {
  const questionConfig: QuestionConfig = questionsJson[key]

  // Step1: ask question and get answer
  const answer = (
    await prompt([
      {
        type: questionConfig.type,
        name: key,
        message: questionConfig.question,
        choices: questionConfig.choices,
        default: questionConfig?.default?.(answers),
        prefix: chalk.blue('?'),
        suffix: questionConfig.suffix,
        validate: questionConfig.validate,
        pageSize: 9990,
      },
    ])
  )[key]

  // Step2: add answer to answers
  answers[key] = answer

  // Step3: add outcome to outcomes
  outcomes = {
    ...questionConfig.outcomes![answer],
    ...outcomes,
  }

  if (questionConfig.outcomes![answer]) {
    outcomes = {
      ...questionConfig.outcomes![answer],
      ...outcomes,
    }
  }

  if (
    questionConfig.next === 'end' ||
    (questionConfig.next as Record<string, string>)[answer] === 'end'
  ) {
    return [answers, outcomes]
  }

  //eslint-disable-next-line
  //@ts-ignore
  const nextQuestion = questionConfig.next[answer] || questionConfig.next
  return await askQuestion(nextQuestion, answers, outcomes)
}

export function newAdapter2Command(program: Command) {
  program
    .command('new-adapter2')
    .description('Start the interactive CLI questionnaire')
    .action(initiateQuestionnaire)
}

export async function readBlankTemplate(filePath: string) {
  return readFile(filePath, { encoding: 'utf8' })
}

export function generateAdapter(
  answers: Answers,
  outcomes: Outcomes,
  blankAdapter: string,
): string {
  return Object.keys(Replacements).reduce(
    (currentTemplate, replace: string) => {
      // Check if the operation exists in the Replacements object
      const replacement = Replacements[replace as keyof typeof Replacements]
      if (replacement) {
        // Apply the replacement operation
        return replacement.replace(outcomes, currentTemplate, answers)
      } else {
        console.warn(`Replacement operation '${replace}' not found.`)
        return currentTemplate
      }
    },
    blankAdapter,
  )
}

/**
 * @description Creates a new adapter using the template
 */
async function buildAdapterFromBlankTemplate(
  answers: Answers,
  outcomes: Outcomes,
) {
  const blankTemplate = await readBlankTemplate(
    'src/adapters/blank/blankTemplate/blankAdapterForCli/blankAdapter.ts',
  )

  const code = generateAdapter(answers, outcomes, blankTemplate!)

  await createAdapterFile(answers, code)
}

async function createAdapterFile(answers: Answers, code: string) {
  const adapterFilePath = buildAdapterFilePath(
    answers.protocolId,
    answers.productId,
    answers.adapterClassName,
  )

  await writeCodeFile(adapterFilePath, code)
}

export function buildAdapterFilePath(
  protocolId: string,
  productId: string,
  adapterClassName: string,
): string {
  const productPath = path.resolve(
    `./src/adapters/${protocolId}/products/${productId}`,
  )

  return path.resolve(productPath, `${lowerFirst(adapterClassName)}.ts`)
}

export function adapterClassName(protocolKey: string, productId: string) {
  return `${protocolKey}${pascalCase(productId)}Adapter`
}
