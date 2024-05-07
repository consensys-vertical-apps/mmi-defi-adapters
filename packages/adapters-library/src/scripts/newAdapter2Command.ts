import { readFile } from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { Command } from 'commander'
import { prompt } from 'inquirer'
import { Chain } from '../core/constants/chains'
import { lowerFirst, pascalCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { writeAndLintFile } from '../core/utils/writeAndLintFile'
import type { DefiProvider } from '../defiProvider'
import { generateAdapter } from './generateAdapter'
import {
  addProtocol,
  buildIntegrationTests,
  exportAdapter,
} from './newAdapterCommand'
import { questionsJson } from './questionnaire'
import { Templates } from './templates/templates'

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
  // biome-ignore lint/suspicious/noExplicitAny: Too broad to define
  outcomes?: Record<keyof Answers, any>
  validate?: (input: string, answers: Answers) => boolean | string
  validateProductId?: (
    defiProvider: DefiProvider,
    answers: Answers,
  ) => (input: string) => boolean | string
  suffix?: string
  default: (
    answers: Answers,
    defiAdapter?: DefiProvider,
  ) => string | boolean | (keyof typeof Chain)[]
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
  unwrap:
    | 'useUnwrapOneToOneMethod'
    | 'useUnwrapRatioMethod'
    | 'notImplementedError'
  withdrawalsFunction: 'useWithdrawalHelper' | 'notImplementedError'
  depositsFunction: 'useDepositsHelper' | 'notImplementedError'
  template: keyof typeof Templates | 'No'
}

export type Answers = Omit<
  Record<keyof typeof questionsJson, string>,
  'chainKeys'
> & {
  chainKeys: (keyof typeof Chain)[]
  adapterClassName: string
}

export async function newAdapter2Command(
  program: Command,
  defiProvider: DefiProvider,
) {
  program
    .command('new-adapter2')
    .description('Start the interactive CLI questionnaire')
    .option('-y, --yes', 'Skip prompts and use default values')
    .option('-t, --template <template>', 'Template to use')
    .action(initiateQuestionnaire(defiProvider))
}

function initiateQuestionnaire(defiProvider: DefiProvider) {
  return async ({
    yes: skipQuestions,
    template: inputTemplate,
  }: {
    yes: boolean
    template: Outcomes['template']
  }) => {
    let answers = {} as Answers

    if (!skipQuestions) {
      const isExit = await welcome()
      if (isExit) {
        return
      }

      const firstQuestionId = 'protocolKey'

      answers = await askQuestion(firstQuestionId, defiProvider)
    } else {
      answers = calculateDefaultAnswers(inputTemplate)
      console.log({ answers, inputTemplate })
      answers.productId = `${answers.productId}-${answers.forkCheck
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '')}Template`
    }

    answers.adapterClassName = adapterClassName(
      answers.protocolKey,
      answers.productId,
    )

    answers.forkCheck = inputTemplate ?? answers.forkCheck

    const outcomes = calculateAdapterOutcomes(answers)

    switch (true) {
      case outcomes.template === 'No': {
        await buildAdapterFromBlankTemplate(answers, outcomes)
        break
      }
      case Object.keys(Templates).includes(outcomes.template):
        {
          const templates = Templates[outcomes.template]!
          for (const template of templates) {
            const code = template(answers)
            await createAdapterFile(answers, code)
          }
        }
        break
      default: {
        logger.error(`Template not found: ${answers.forkCheck}`)
        logger.error(
          `Must be one of these values: No, ${Object.keys(Templates).join(
            ', ',
          )}`,
        )
        throw new Error(`No template with name: ${answers.forkCheck}`)
      }
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
    console.log('The file has been saved!')
  }
}

function calculateDefaultAnswers(inputTemplate?: string) {
  const answers = Object.keys(questionsJson).reduce((acc, key) => {
    acc[key as keyof Answers] = questionsJson[
      key as keyof typeof questionsJson
      // biome-ignore lint/suspicious/noExplicitAny: Not sure - TODO
    ].default(acc) as any
    return acc
  }, {} as Answers)

  if (inputTemplate) {
    answers.forkCheck = inputTemplate
  }
  return answers
}

function calculateAdapterOutcomes(answers: Answers) {
  return Object.keys(questionsJson).reduce((acc, key) => {
    const answer = answers[key as keyof Answers]

    const questionConfig = questionsJson[key as keyof typeof questionsJson]

    // Step3: add outcome to outcomes
    if ('outcomes' in questionConfig) {
      return {
        ...(questionConfig.outcomes![
          answer as keyof typeof questionConfig.outcomes
        ] as object),
        ...acc,
      }
    }

    return acc
  }, {} as Outcomes)
}

async function welcome() {
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
      const question = questionsJson[questionKey as keyof typeof questionsJson]
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
        console.log(greenBrightText(' 1. Yes'))
        console.log(greenBrightText(' 2. No'))
      }
      if (question.type === 'text') {
        console.log(greenBrightText('Options:'))
        console.log(
          `${greenBrightText(' 1. string')} (e.g ${greenBrightText(
            question.default({} as Answers),
          )}`,
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
      return true
    }
  }
}

async function askQuestion(
  key: keyof typeof questionsJson,
  defiProvider: DefiProvider,
  answers = {} as Answers,
  outcomes = {} as Outcomes,
): Promise<Answers> {
  const questionConfig = questionsJson[key] as QuestionConfig

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
          questionConfig?.validateProductId?.(defiProvider, answers) ??
          questionConfig.validate,
        pageSize: 9990,
      },
    ])
  )[key]

  // Step2: add answer to answers
  answers[key as keyof Answers] = answer

  if (
    questionConfig.next === 'end' ||
    (questionConfig.next as Record<string, string>)[answer] === 'end'
  ) {
    return answers
  }

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
    './packages/adapters-library/src/adapters/blank/blankTemplate/blankAdapterForCli/blankAdapter.ts',
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

  await writeAndLintFile(adapterFilePath, code)
}

export function buildAdapterFilePath(
  protocolId: string,
  productId: string,
  adapterClassName: string,
): string {
  const productPath = path.resolve(
    `./packages/adapters-library/src/adapters/${protocolId}/products/${productId}`,
  )

  return path.resolve(productPath, `${lowerFirst(adapterClassName)}.ts`)
}

export function adapterClassName(protocolKey: string, productId: string) {
  return `${protocolKey}${pascalCase(productId)}Adapter`
}
