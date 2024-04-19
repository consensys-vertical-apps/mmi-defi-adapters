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

type Metadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export const PLACEHOLDER_BUILD_METADATA = '' as unknown as Metadata
export const PLACEHOLDER_GET_PROTOCOL_TOKENS = '' as any
export const PLACEHOLDER_GET_POSITIONS = '' as any
export const PLACEHOLDER_GET_WITHDRAWALS = '' as any
export const PLACEHOLDER_GET_DEPOSITS = '' as any
export const PLACEHOLDER_UNWRAP = '' as any
export const PLACEHOLDER_ASSET_TYPE = '' as any

export interface QuestionConfig {
  question: string
  type: string
  choices?: readonly string[] // Only needed for certain types of questions, e.g., 'list'
  next: Record<string, string> | string
  //eslint-disable-next-line
  outcomes?: Record<string, any>
  validate?: (input: string) => boolean | string
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
  const firstQuestionId = 'protocolKey'

  const [answers, outcomes] = await askQuestion(firstQuestionId)

  // create adapter class name
  answers.adapterClassName = adapterClassName(
    answers.protocolKey,
    answers.productId,
  )

  console.log('End of questionnaire')

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
        await buildAdapterFromBlackTemplate(answers, outcomes)
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
        validate: questionConfig.validate,
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

async function readBlankTemplate(filePath: string) {
  return readFile(filePath, { encoding: 'utf8' })
}

function generateAdapter(
  answers: Answers,
  outcomes: Outcomes,
  blankAdapter: string,
): string {
  let updatedTemplate = blankAdapter
    .replace(/adapterClassName/g, answers.adapterClassName)
    .replace(/{{protocolId}}/g, answers.protocolId)
    .replace(/{{protocolKey}}/g, answers.protocolKey)
    .replace(/{{productId}}/g, answers.productId)

  if (outcomes.defiAssetStructure) {
    const regex = new RegExp('return PLACEHOLDER_ASSET_TYPE', 'g')

    switch (outcomes.defiAssetStructure) {
      case 'singleProtocolToken' || 'multipleProtocolTokens':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `AssetType.StandardErc20`,
        )
        break

      default:
        updatedTemplate = updatedTemplate.replace(
          regex,
          `AssetType.NonStandardErc20`,
        )
        break
    }
  }

  if (outcomes.unwrap) {
    const regex = new RegExp('return PLACEHOLDER_UNWRAP', 'g')

    switch (outcomes.unwrap) {
      case 'useOneToOneMethod':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `return helpers.unwrapOneToOne({
            protocolToken: await this.getProtocolToken(_input.protocolTokenAddress),
            underlyingTokens: await this.getUnderlyingTokens(_input.protocolTokenAddress)
          })`,
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

  if (outcomes.getPositions && outcomes.defiAssetStructure) {
    const replace = new RegExp('return PLACEHOLDER_GET_POSITIONS', 'g')

    switch (`${outcomes.getPositions}_${outcomes.defiAssetStructure}`) {
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

  if (outcomes.buildMetadataFunction && outcomes.underlyingTokens) {
    const regex = new RegExp('return PLACEHOLDER_BUILD_METADATA', 'g')

    switch (`${outcomes.buildMetadataFunction}_${outcomes.underlyingTokens}`) {
      case 'singleProtocolToken_oneUnderlying':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `const protocolToken = await helpers.getTokenMetadata(
            getAddress('0x'),
            this.chainId,
            this.provider,
          )
      
          const underlyingTokens = await helpers.getTokenMetadata(
            getAddress('0x'),
            this.chainId,
            this.provider,
          )
          return {
            [protocolToken.address]: {
              protocolToken: protocolToken,
              underlyingTokens: [underlyingTokens],
            },
          }`,
        )
        break
      case 'singleProtocolToken_multipleUnderlying':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `    const protocolToken = await helpers.getTokenMetadata(
            '0x',
            this.chainId,
            this.provider,
          )
      
          const underlyingTokensOne = await helpers.getTokenMetadata(
            '0x',
            this.chainId,
            this.provider,
          )
          const underlyingTokensTwo = await helpers.getTokenMetadata(
            '0x',
            this.chainId,
            this.provider,
          )
          return {
            [protocolToken.address]: {
              protocolToken: protocolToken,
              underlyingTokens: [underlyingTokensOne, underlyingTokensTwo],
            },
          }`,
        )
        break
      case 'multipleProtocolTokens_oneUnderlying':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `throw new NotImplementedError()`,
        )
        break
      case 'multipleProtocolTokens_multipleUnderlying':
        updatedTemplate = updatedTemplate.replace(
          regex,
          `throw new NotImplementedError()`,
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

  if (outcomes.withdrawalsFunction && outcomes.depositsFunction) {
    const regexWithdrawals = new RegExp(
      'return PLACEHOLDER_GET_WITHDRAWALS',
      'g',
    )
    const regexDeposits = new RegExp('return PLACEHOLDER_GET_DEPOSITS', 'g')

    switch (`${outcomes.withdrawalsFunction}_${outcomes.depositsFunction}`) {
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

  if (outcomes.rewards) {
    const regexRewardPositions = /\/\/PLACEHOLDER_GET_REWARD_POSITIONS/g
    const regexRewardWithdrawals = /\/\/PLACEHOLDER_GET_REWARD_WITHDRAWALS/g
    const regexGetPositionsFunctionName = /getPositions/g
    const regexGetWithdrawalsFunctionName = /getWithdrawals/g
    switch (outcomes.rewards) {
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
  }

  const regexProtocolTokens = new RegExp(
    'return PLACEHOLDER_GET_PROTOCOL_TOKENS',
    'g',
  )
  switch (outcomes.defiAssetStructure) {
    case 'singleProtocolToken' || 'multiProtocolToken':
      updatedTemplate = updatedTemplate.replace(
        regexProtocolTokens,
        `return Object.values(await this.buildMetadata()).map(
          ({ protocolToken }) => protocolToken,
        )`,
      )

      break
    default:
      updatedTemplate = updatedTemplate.replace(
        regexProtocolTokens,
        'throw new NotImplementedError()',
      )

      break
  }

  return updatedTemplate
}

/**
 * @description Creates a new adapter using the template
 */
async function buildAdapterFromBlackTemplate(
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
