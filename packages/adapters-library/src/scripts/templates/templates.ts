import { Answers } from '../newAdapter2Command'
import { compoundV2BorrowMarketForkAdapterTemplate } from './compoundV2BorrowMarketForkAdapter'
import { compoundV2SupplyMarketForkAdapterTemplate } from './compoundV2SupplyMarketForkAdapter'
import { uniswapV2PoolForkAdapterTemplate } from './uniswapV2PoolForkAdapter'
import { votingEscrowAdapterTemplate } from './votingEscrowAdapter'
import { writeOnlyDeFiAdapter } from './writeOnlyDeFiAdapter'

export type TemplateBuilder = (adapterSettings: Answers) => string

export const Templates: Record<string, TemplateBuilder[]> = {
  ['UniswapV2PoolForkAdapter']: [uniswapV2PoolForkAdapterTemplate],
  ['CompoundV2 Supply Market']: [compoundV2SupplyMarketForkAdapterTemplate],
  ['CompoundV2 Borrow Market']: [compoundV2BorrowMarketForkAdapterTemplate],
  ['VotingEscrowAdapter (like curve and stargate voting escrow)']: [
    votingEscrowAdapterTemplate,
  ],
  ['WriteOnlyDeFiAdapter (supports only create transaction params, no getPositions features)']:
    [writeOnlyDeFiAdapter],
}
