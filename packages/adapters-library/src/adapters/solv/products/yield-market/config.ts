import { getAddress } from 'ethers'
import { Chain } from '../../../../core/constants/chains'

export interface SolvYieldMarketConfig {
  navOracleAddress: string
  openFundMarketAddress: string
  redemptionDelegateAddress: string
  redemptionConcreteAddress: string
  shareDelegateAddress: string
  shareConcreteAddress: string
}

export const SOLV_YIELD_MARKETS: Partial<Record<Chain, SolvYieldMarketConfig>> =
  {
    [Chain.Arbitrum]: {
      navOracleAddress: getAddress(
        '0x6ec1fEC6c6AF53624733F671B490B8250Ff251eD',
      ),
      openFundMarketAddress: getAddress(
        '0x629aD7Bc14726e9cEA4FCb3A7b363D237bB5dBE8',
      ),
      redemptionDelegateAddress: getAddress(
        '0xe9bd233b2b34934fb83955ec15c2ac48f31a0e8c',
      ),
      redemptionConcreteAddress: getAddress(
        '0x5Fc1Dd6ce1744B8a45f815Fe808E936f5dc97320',
      ),
      shareDelegateAddress: getAddress(
        '0x22799daa45209338b7f938edf251bdfd1e6dcb32',
      ),
      shareConcreteAddress: getAddress(
        '0x9d9AaF63d073b4C0547285e98d126770a80C4dcE',
      ),
    },
    [Chain.Bsc]: {
      navOracleAddress: getAddress(
        '0x9C491539AeC346AAFeb0bee9a1e9D9c02AB50889',
      ),
      openFundMarketAddress: getAddress(
        '0xaE050694c137aD777611286C316E5FDda58242F3',
      ),
      redemptionDelegateAddress: getAddress(
        '0xe16cec2f385ea7a382772334a44506a865f98562',
      ),
      redemptionConcreteAddress: getAddress(
        '0x59999fe6a26c048f623a7476344702de56633cF4',
      ),
      shareDelegateAddress: getAddress(
        '0xb816018e5d421e8b809a4dc01af179d86056ebdf',
      ),
      shareConcreteAddress: getAddress(
        '0x7851fA49C56f8996444C869534CA311C0eAB3854',
      ),
    },
  }

/**
 * Maps the GOEFS and GOEFR slot / product ID to the product name,
 * for the lack of having found a way to read it from chain.
 *
 * @TODO Redemption slots are missing. Will add them when moving to Metadata.
 */
export const SLOT_TO_PRODUCT_NAME: Record<string, string> = {
  // Arbitrum - Fund SFT
  '5310353805259224968786693768403624884928279211848504288200646724372830798580':
    'GMX V2 USDC - A',
  '70120449060830493694329237233476283664004495384113064083934107225342856266913':
    'GMX V2 WBTC - A',
  '90475336609644448573394272833482234840324043364960181744352364553367280007122':
    'GMX V2 USDC - Senior',
  '18834720600760682316079182603327587109774167238702271733823387280510631407444':
    'GMX V2 WBTC - B',
  '85588310140314543721105880238735853818871955453308764959170830337250794294829':
    'GMX V2 WETH - B',
  '32632017617207478546475046691496646944368542238531499037653794403708832457936':
    'GMX V2 USDC - B',
  '10171050319075320644586539334401394801050934983625915448386431993435893492954':
    'RWA USDT - B',
  '17873186957027148109033339637575361280044016486300679380351688892728620516739':
    'MUX USDT - A',
  // Arbitrum - Redemption SFT
  '27535899373016562799550525270503210156231108318579724454061568587307360604889':
    'GMX V2 USDC - A',
  // BSC - Fund SFT
  '67766898239605156258501380852207923193619740467985810194663587771723472117631':
    'SolvBTC BNB LP Vault - BSC - B',
  '107795438894633394025820351322700143223339318121737007372144016231468215188882':
    'SolvBTC LP Vault - BSC',
}
