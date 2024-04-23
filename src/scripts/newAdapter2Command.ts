import { readFile } from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { Command } from 'commander'
import { prompt } from 'inquirer'
import { Chain } from '../core/constants/chains'
import { lowerFirst, pascalCase } from '../core/utils/caseConversion'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import {
  buildIntegrationTests,
  addProtocol,
  exportAdapter,
} from './newAdapterCommand'
import { questionsJson } from './questionnaire'

import { compoundV2BorrowMarketForkAdapterTemplate } from './templates/compoundV2BorrowMarketForkAdapter'
import { compoundV2SupplyMarketForkAdapterTemplate } from './templates/compoundV2SupplyMarketForkAdapter'
import { uniswapV2PoolForkAdapterTemplate } from './templates/uniswapV2PoolForkAdapter'
import { votingEscrowAdapterTemplate } from './templates/votingEscrowAdapter'
import { generateAdapter } from './generateAdapter'
import type { DefiProvider } from '../defiProvider'

const colorBlue = chalk.rgb(0, 112, 243).bold
const boldWhiteBg = chalk.bgWhite.bold
const boldText = chalk.bold
const greenBrightText = chalk.italic
const bluePrefix = chalk.blue('?')

export interface QuestionConfig {
  question: string
  type: string
  choices?: readonly string[] // Only needed for certain types of questions, e.g., 'list'
  next: Record<string, string> | string
  //eslint-disable-next-line
  outcomes?: Record<string, any>
  validate?: (input: string) => boolean | string
  validateProductId?: (
    defiProvider: DefiProvider,
  ) => (input: string) => boolean | string
  suffix?: string
  default?: (answers: Answers, defiAdapter?: DefiProvider) => string | string[]
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
  template: 'CompoundV2' | 'CurveGovernanceVesting' | 'UniswapV2' | 'No'
}

export type Answers = {
  chainKeys: (keyof typeof Chain)[]
  adapterClassName: string
  protocolId: string
  productId: string
  protocolKey: string
  forkCheck: string
  erc20Event: string
  balanceQueryMethod: string
  unwrapSimpleMapping: string
  additionalRewards: string
}

export async function newAdapter2Command(
  program: Command,
  defiProvider: DefiProvider,
) {
  program
    .command('new-adapter2')
    .description('Start the interactive CLI questionnaire')
    .action(initiateQuestionnaire(defiProvider))
}

function initiateQuestionnaire(defiProvider: DefiProvider) {
  return async () => {
    console.log(
      colorBlue(
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
                                                             
                                                             
                                                             
                                                             `,
      ),
    )

    const firstQuestionId = 'protocolKey'

    const listQuestionsAnswers = await prompt({
      type: 'confirm',
      name: 'viewAllQuestions',
      message:
        'Would you like to view all questions? This will help you know what to look for in the protocol.',
      prefix: chalk.blue('?'),
    })

    if (listQuestionsAnswers['viewAllQuestions']) {
      console.log()
      console.log(
        boldWhiteBg(
          '                                            All questions                                              ',
        ),
      )

      Object.keys(questionsJson).forEach((questionKey, index) => {
        const question =
          questionsJson[questionKey as keyof typeof questionsJson]
        console.log(
          greenBrightText(
            boldText(`Q${index + 1} ${pascalCase(questionKey)}: `),
          ) + greenBrightText(`${question.question}`),
        )

        // Check if the question has choices and print them
        if ('choices' in question) {
          console.log(greenBrightText('Options:'))
          question.choices.forEach((choice: string, index: number) => {
            console.log(greenBrightText(`  ${index + 1}. ${choice}`))
          })
        }
        if (question.type === 'confirm') {
          console.log(greenBrightText('Options:'))
          console.log(greenBrightText(` 1. Yes`))
          console.log(greenBrightText(` 2. No`))
        }
        if (question.type === 'text') {
          console.log(greenBrightText('Options:'))
          console.log(
            greenBrightText(` 1. string`) +
              ` (e.g ` +
              greenBrightText(question.default({} as Answers)) +
              `)`,
          )
        }

        console.log()
      })
      console.log()
      console.log(
        boldWhiteBg(
          '                                            All questions end                                              ',
        ),
      )
      console.log()
      const start = await prompt({
        type: 'confirm',
        name: 'start',
        message: 'Ready to answer the questions? ',
        prefix: bluePrefix,
      })

      if (!start['start']) {
        console.log('Goodbye!')
        return
      }
    }

    const [answers, outcomes] = await askQuestion(
      firstQuestionId,

      defiProvider,
    )

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
}

async function askQuestion(
  key: keyof typeof questionsJson,
  defiProvider: DefiProvider,
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
        validate:
          questionConfig?.validateProductId?.(defiProvider) ??
          questionConfig.validate,
        pageSize: 9990,
      },
    ])
  )[key]

  // Step2: add answer to answers
  answers[key as keyof Answers] = answer

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
  return await askQuestion(nextQuestion, defiProvider, answers, outcomes)
}

export async function readBlankTemplate(filePath: string) {
  return readFile(filePath, { encoding: 'utf8' })
}

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
