import { readFile } from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { Command } from 'commander'
import { prompt } from 'inquirer'
import { Chain } from '../core/constants/chains'
import { lowerFirst, pascalCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import type { DefiProvider } from '../defiProvider'
import { generateAdapter } from './generateAdapter'
import {
  addProtocol,
  buildIntegrationTests,
  exportAdapter,
} from './newAdapterCommand'
import { QuestionName, getQuestionnaire } from './questionnaire'
import { Templates } from './templates/templates'
import { newAdapterCliLogo } from './newAdapterCliLogo'

const colorBlue = chalk.rgb(0, 112, 243).bold
const boldWhiteBg = chalk.bgWhite.bold
const boldText = chalk.bold
const italic = chalk.italic
const bluePrefix = chalk.blue('?')

export interface QuestionConfig {
  question: string
  type: string
  choices?: readonly string[] // Only needed for certain types of questions, e.g., 'list'
  next: () => KeyofQuestionnaire | 'end'
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
  hasRewards: boolean
  hasExtraRewards: boolean
  hasProtocolRewards: boolean
}

type Awaited<T> = T extends PromiseLike<infer U> ? U : T
type QuestionnaireType = Awaited<ReturnType<typeof getQuestionnaire>>
type KeyofQuestionnaire = keyof QuestionnaireType

export type Answers = Omit<
  Record<KeyofQuestionnaire, string>,
  'chainKeys' | 'rewardDetails'
> & {
  chainKeys: (keyof typeof Chain)[]
  rewardDetails: string[]
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
      const isExit = await welcome(defiProvider)
      if (isExit) {
        return
      }

      const firstQuestionId = 'protocolKey'

      answers = await askQuestion(firstQuestionId, defiProvider)
    } else {
      const questionnaire = getQuestionnaire(defiProvider, answers)
      answers = calculateDefaultAnswers(questionnaire, inputTemplate)
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
    const questionnaire = getQuestionnaire(defiProvider, answers)
    const outcomes = calculateAdapterOutcomes(questionnaire, answers)

    console.log(outcomes, answers)

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

function calculateDefaultAnswers(
  questionnaire: QuestionnaireType,
  inputTemplate?: string,
) {
  const answers = Object.keys(questionnaire).reduce((acc, key) => {
    acc[key as keyof Answers] = questionnaire[
      key as keyof typeof questionnaire
      // biome-ignore lint/suspicious/noExplicitAny: Not sure - TODO
    ].default() as any
    return acc
  }, {} as Answers)

  if (inputTemplate) {
    answers.forkCheck = inputTemplate
  }
  return answers
}

function calculateAdapterOutcomes(
  questionnaire: QuestionnaireType,
  answers: Answers,
) {
  return Object.keys(questionnaire).reduce((acc, key) => {
    const answer = answers[key as keyof Answers]

    const questionConfig = questionnaire[key as KeyofQuestionnaire]

    // Step3: add outcome to outcomes
    if ('outcomes' in questionConfig && Array.isArray(answer)) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      let outcomes: { [key: string]: any } = {}

      answer.forEach((outcomeKey) => {
        outcomes = {
          ...outcomes,
          ...(questionConfig.outcomes![
            outcomeKey as keyof typeof questionConfig.outcomes
          ] as object),
        }
      })

      return {
        ...outcomes,
        ...acc,
      }
    }
    if ('outcomes' in questionConfig && !Array.isArray(answer)) {
      const outcomes = questionConfig.outcomes![
        answer as keyof typeof questionConfig.outcomes
      ] as object

      return {
        ...outcomes,
        ...acc,
      }
    }

    return acc
  }, {} as Outcomes)
}

async function welcome(defiProvider: DefiProvider) {
  console.log(
    colorBlue(
      newAdapterCliLogo,
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
        'See all questions below:                                                                                          ',
      ),
    )
    console.log(
      boldWhiteBg(
        '                                                                                                                  ',
      ),
    )
    console.log(
      boldWhiteBg(
        '                                                                                                                  ',
      ),
    )

    const questionnaire = getQuestionnaire(defiProvider, {})



    Object.keys(questionnaire).forEach((questionKey, index) => {
      const question = questionnaire[questionKey as KeyofQuestionnaire]
      console.log(
        italic(boldText(`Q${index + 1} ${pascalCase(questionKey)}: `)) +
          italic(`${question.message}`),
      )

      // Check if the question has choices and print them
      if ('choices' in question) {
        console.log(italic('Options:'))
        question.choices.forEach((choice: string, index: number) => {
          console.log(italic(`  ${index + 1}. ${choice}`))
        })
      }
      if (question.type === 'confirm') {
        console.log(italic('Options:'))
        console.log(italic(' 1. Yes'))
        console.log(italic(' 2. No'))
      }
      if (question.type === 'text') {
        console.log(italic('Options:'))
        console.log(`${italic(' For example')} ${italic(question.default())}`)
      }

      console.log()
    })
    console.log()
    console.log(
      boldWhiteBg(
        'All questions end                                                                                                  ',
      ),
    )
    console.log(
      boldWhiteBg(
        '                                                                                                                   ',
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
  nextQuestionName: KeyofQuestionnaire,
  defiProvider: DefiProvider,
  answers = {} as Answers,
  outcomes = {} as Outcomes,
): Promise<Answers> {

  console.log(nextQuestionName)
  const questionConfig = getQuestionnaire(defiProvider, answers)[nextQuestionName]

  console.log(questionConfig)

  // Step1: ask question and get answer
  const answer = (
    await prompt([
      {
        ...questionConfig,
        prefix: chalk.blue('?'),
        pageSize: 9990,
      },
    ])
  )[nextQuestionName]

  // Step2: add answer to answers
  answers[nextQuestionName as keyof Answers] = answer

  if (questionConfig.next(answer) === 'end') {
    return answers
  }

  const nextQuestion = questionConfig.next(answer) as QuestionName
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

  await writeCodeFile(adapterFilePath, code)
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
