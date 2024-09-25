import { readFile } from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { Command } from 'commander'
import { prompt } from 'inquirer'
import { Chain } from '../../core/constants/chains'
import { lowerFirst, pascalCase } from '../../core/utils/caseConversion'
import { logger } from '../../core/utils/logger'
import { writeAndLintFile } from '../../core/utils/writeAndLintFile'
import type { DefiProvider } from '../../defiProvider'
import { addProtocol } from './addProtocol'
import { buildIntegrationTests } from './buildIntegrationTests'
import { exportAdapter } from './exportAdapter'
import { newAdapterCliLogo } from './newAdapterCliLogo'
import {
  BlankAdapterOutcomeOptions,
  QuestionAnswers,
  QuestionName,
  TemplateNames,
  Templates,
  getQuestionnaire,
} from './questionnaire'
import { Replacements } from './replacements'

const colorBlue = chalk.rgb(0, 112, 243).bold
const boldWhiteBg = chalk.bgWhite.bold
const boldText = chalk.bold
const italic = chalk.italic
const bluePrefix = chalk.blue('?')

type QuestionnaireType = Awaited<ReturnType<typeof getQuestionnaire>>
type KeyofQuestionnaire = keyof QuestionnaireType
type ValueOfQuestionnaire = QuestionnaireType[KeyofQuestionnaire]

export async function newAdapterCommand(
  program: Command,
  defiProvider: DefiProvider,
) {
  program
    .command('new-adapter')
    .description('Start the interactive CLI questionnaire')
    .option('-y, --yes', 'Skip prompts and use default values')
    .option('-t, --template <template>', 'Template to use')
    .action(initiateQuestionnaire(defiProvider))
}

export function initiateQuestionnaire(defiProvider: DefiProvider) {
  return async ({
    yes: skipQuestions,
    template: inputTemplate,
  }: {
    yes: boolean
    template: QuestionAnswers['forkCheck']
  }) => {
    if (!skipQuestions) {
      const exit = await welcome(defiProvider)
      if (exit) {
        return
      }
    }

    const answers = await getAnswersAndOutcomes(
      defiProvider,
      skipQuestions,
      inputTemplate,
    )

    const outcomes = calculateAdapterOutcomes(defiProvider, answers)

    const code: string = await createCode(answers, outcomes)

    await createAdapterFile(answers, code, outcomes)
    await buildIntegrationTests(answers)
    await addProtocol(answers)
    await exportAdapter({
      ...answers,
      adapterClassName: outcomes.adapterClassName,
    })

    console.log(
      chalk`\n{bold New adapter created at: {bgBlack.red src/adapters/${
        answers.protocolId
      }/products/${answers.productId}/${lowerFirst(
        outcomes.adapterClassName,
      )}.ts}}\n`,
    )
    console.log('The file has been saved!')
  }
}

export async function createCode(
  answers: QuestionAnswers,
  outcomes: BlankAdapterOutcomeOptions,
) {
  let code: string
  switch (true) {
    case answers.forkCheck === TemplateNames.SmartBuilder: {
      const blankTemplate = Templates[answers.forkCheck]!()

      code = generateAdapter(answers, outcomes, blankTemplate!)

      break
    }
    case Object.keys(Templates).includes(answers.forkCheck):
      {
        const template = Templates[answers.forkCheck]!
        code = template({
          protocolKey: answers.protocolKey,
          adapterClassName: outcomes.adapterClassName,
          productId: answers.productId,
          chainKeys: answers.chainKeys,
        })
      }
      break
    default: {
      logger.error(`Template not found: ${answers.forkCheck}`)
      logger.error(
        `Must be one of these values: No, ${Object.keys(Templates).join(', ')}`,
      )
      throw new Error(`No template with name: ${answers.forkCheck}`)
    }
  }
  return code
}

async function getAnswersAndOutcomes(
  defiProvider: DefiProvider,
  skipQuestions: boolean,
  inputTemplate: QuestionAnswers['forkCheck'],
) {
  let answers = {} as QuestionAnswers

  if (!skipQuestions) {
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

  answers.forkCheck = inputTemplate ?? answers.forkCheck

  return answers
}

function calculateDefaultAnswers(
  questionnaire: QuestionnaireType,
  inputTemplate?: string,
) {
  const answers = {} as QuestionAnswers

  Object.keys(questionnaire).forEach((key) => {
    const defaultValue =
      questionnaire[key as keyof typeof questionnaire].default()

    //@ts-ignore
    answers[key as keyof typeof QuestionAnswers] = defaultValue
  })

  if (inputTemplate) {
    //@ts-ignore
    answers.forkCheck = inputTemplate
  }
  return answers
}

export function calculateAdapterOutcomes(
  defiProvider: DefiProvider,
  answers: QuestionAnswers,
): BlankAdapterOutcomeOptions {
  const questionnaire = getQuestionnaire(defiProvider, answers)

  // Bit of a hack to add QuestionName.AdapterClassName but its a skip question that I want the answer for
  // find better way to include that answer
  return [...Object.keys(answers), QuestionName.AdapterClassName].reduce(
    (acc, key) => {
      const answer = answers[key as keyof QuestionAnswers]
      const questionConfig = questionnaire[key as keyof QuestionnaireType]
      // Step 3: add outcome to outcomes
      if ('outcomes' in questionConfig) {
        let outcomeResults: Partial<BlankAdapterOutcomeOptions> = {}

        const newOutcomes = questionConfig.outcomes(
          //@ts-ignore
          answer,
        ) as Partial<BlankAdapterOutcomeOptions>

        outcomeResults = {
          ...outcomeResults,

          ...newOutcomes,
        }
        return {
          ...acc,
          ...outcomeResults,
        }
      }

      return acc
    },
    {} as BlankAdapterOutcomeOptions,
  )
}

async function welcome(defiProvider: DefiProvider) {
  showMessage(colorBlue(newAdapterCliLogo))

  const listQuestionsAnswers = await prompt({
    type: 'confirm',
    name: 'viewAllQuestions',
    message:
      'Would you like to view all questions? This will help you know what to look for in the protocol.',
    prefix: chalk.blue('?'),
  })

  if (listQuestionsAnswers.viewAllQuestions) {
    displayAllQuestions(defiProvider)

    const start = await prompt({
      type: 'confirm',
      name: 'start',
      message: 'Ready to answer the questions?',
      prefix: bluePrefix,
    })

    if (!start.start) {
      showMessage('Goodbye!')
      return true
    }
  }
}

function displayAllQuestions(defiProvider: DefiProvider) {
  showMessage(boldWhiteBg('See all questions below:'))
  showMessage(boldWhiteBg(' '.repeat(110)))
  showMessage(boldWhiteBg(' '.repeat(110)))

  const questionnaire = getQuestionnaire(defiProvider, {})

  Object.keys(questionnaire).forEach((questionKey, index) => {
    const question = questionnaire[questionKey as KeyofQuestionnaire]
    showMessage(
      italic(boldText(`Q${index + 1} ${pascalCase(questionKey)}: `)) +
        italic(question.message),
    )

    displayQuestionOptions(question)
  })

  showMessage(boldWhiteBg('All questions end'))
  showMessage(boldWhiteBg(' '.repeat(111)))
}

function displayQuestionOptions(question: ValueOfQuestionnaire) {
  if ('choices' in question) {
    showMessage(italic('Options:'))
    //@ts-ignore
    question.choices.forEach((choice: string, index: number) => {
      showMessage(italic(`  ${index + 1}. ${choice}`))
    })
    //@ts-ignore
  } else if (question.type === 'confirm') {
    showMessage(italic('Options:'))
    showMessage(italic(' 1. Yes'))
    showMessage(italic(' 2. No'))
    //@ts-ignore
  } else if (question.type === 'text') {
    showMessage(italic('Options:'))
    //@ts-ignore
    showMessage(`${italic(' For example')} ${italic(question.default())}`)
  }
}

function showMessage(message: string) {
  console.log(message)
}

async function askQuestion(
  nextQuestionName: KeyofQuestionnaire,
  defiProvider: DefiProvider,
  answers = {} as QuestionAnswers,
  outcomes = {} as BlankAdapterOutcomeOptions,
): Promise<QuestionAnswers> {
  const questionConfig = getQuestionnaire(defiProvider, answers)[
    nextQuestionName
  ]

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

  //@ts-ignore
  answers[nextQuestionName as keyof QuestionAnswers] = answer

  //@ts-ignore
  if (questionConfig.next(answer) === 'end') {
    return answers
  }

  //@ts-ignore
  const nextQuestion = questionConfig.next(answer) as QuestionName
  return await askQuestion(nextQuestion, defiProvider, answers, outcomes)
}

export async function readBlankTemplate(filePath: string) {
  return readFile(filePath, { encoding: 'utf8' })
}

async function createAdapterFile(
  answers: QuestionAnswers,
  code: string,
  outcomes: BlankAdapterOutcomeOptions,
) {
  const adapterFilePath = buildAdapterFilePath(
    answers.protocolId,
    answers.productId,
    outcomes.adapterClassName,
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

export function generateAdapter(
  answers: QuestionAnswers,
  outcomes: BlankAdapterOutcomeOptions,
  blankAdapter: string,
): string {
  return Object.keys(Replacements).reduce(
    (currentTemplate, replace: string) => {
      // Check if the operation exists in the Replacements object
      const replacement = Replacements[replace as keyof typeof Replacements]
      if (replacement) {
        // Apply the replacement operation
        return replacement.replace(outcomes, currentTemplate, answers)
      }

      console.warn(`Replacement operation '${replace}' not found.`)
      return currentTemplate
    },
    blankAdapter,
  )
}
