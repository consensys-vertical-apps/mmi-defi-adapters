import { getAddress } from 'ethers'
import { Chain } from '../../../../core/constants/chains'

export interface SolvYieldMarketConfig {
  chainId: Chain
  navOracleAddress: string
  openFundMarketAddress: string
  openFundRedemptionConcreteAddress: string
  openFundRedemptionDelegateAddress: string
  openFundShareConcreteAddress: string
  openFundShareDelegateAddress: string
  pools: SolvYieldMarketPoolConfig[]
}

export interface SolvYieldMarketPoolConfig {
  id: string
  name: string
  currencyAddress: string
  slotInRedemptionSft: string
  slotInShareSft: string
}

/**
 * Good candidate for Metadata.
 *
 * Method OpenFundMarket.poolInfos(poolId) returns most information. Might be usefull for bulding
 * these automatically.
 */
export const SOLV_YIELD_MARKETS: SolvYieldMarketConfig[] = [
  {
    chainId: Chain.Arbitrum,
    navOracleAddress: getAddress('0x6ec1fEC6c6AF53624733F671B490B8250Ff251eD'),
    openFundMarketAddress: getAddress(
      '0x629aD7Bc14726e9cEA4FCb3A7b363D237bB5dBE8',
    ),
    openFundRedemptionDelegateAddress: getAddress(
      '0xe9bd233b2b34934fb83955ec15c2ac48f31a0e8c',
    ),
    openFundRedemptionConcreteAddress: getAddress(
      '0x5Fc1Dd6ce1744B8a45f815Fe808E936f5dc97320',
    ),
    openFundShareDelegateAddress: getAddress(
      '0x22799daa45209338b7f938edf251bdfd1e6dcb32',
    ),
    openFundShareConcreteAddress: getAddress(
      '0x9d9AaF63d073b4C0547285e98d126770a80C4dcE',
    ),
    pools: [
      {
        id: '0xe037ef7b5f74bf3c988d8ae8ab06ad34643749ba9d217092297241420d600fce',
        name: 'GMX V2 USDC - A',
        currencyAddress: getAddress(
          '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        ),
        slotInRedemptionSft:
          '27535899373016562799550525270503210156231108318579724454061568587307360604889',
        slotInShareSft:
          '5310353805259224968786693768403624884928279211848504288200646724372830798580',
      },
      {
        id: '0x3b2232fb5309e89e5ee6e2ca6066bcc28ee365045e9a565040bf8c846b87477e',
        name: 'GMX V2 WBTC - A',
        currencyAddress: getAddress(
          '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        ),
        slotInRedemptionSft: 'xxx',
        slotInShareSft:
          '70120449060830493694329237233476283664004495384113064083934107225342856266913',
      },
      {
        id: '0x504d291d2f4dedf8fa3ac3a342ff3531b8947fa835077c8312fa18da2be4084c',
        name: 'GMX V2 USDC - Senior',
        currencyAddress: getAddress(
          '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        ),
        slotInRedemptionSft: 'xxx',
        slotInShareSft:
          '90475336609644448573394272833482234840324043364960181744352364553367280007122',
      },
      {
        id: '0xe2d154c8cd3f45e2a22572fad8301b195755cf9af10d579e04e90f719206fad0',
        name: 'GMX V2 WBTC - B',
        currencyAddress: getAddress(
          '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        ),
        slotInRedemptionSft: 'xxx',
        slotInShareSft:
          '18834720600760682316079182603327587109774167238702271733823387280510631407444',
      },
      {
        id: '0xc71ee4ace4d770871f1ead92c5fb5e39ea888e8660a8bd27ed3f9423140e6576',
        name: 'GMX V2 WETH - B',
        currencyAddress: getAddress(
          '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        ),
        slotInRedemptionSft: 'xxx',
        slotInShareSft:
          '85588310140314543721105880238735853818871955453308764959170830337250794294829',
      },
      {
        id: '0x392c65b44c03fee27826b645ebc00f3cfd114dc7086523523233766ce0cbd4cf',
        name: 'GMX V2 USDC - B',
        currencyAddress: getAddress(
          '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        ),
        slotInRedemptionSft: 'xxx',
        slotInShareSft:
          '32632017617207478546475046691496646944368542238531499037653794403708832457936',
      },
      {
        id: '0x9119ceb6bcf974578e868ab65ae20c0d546716a6657eb27dc3a6bf113f0b519c',
        name: 'RWA USDT - B',
        currencyAddress: getAddress(
          '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        ),
        slotInRedemptionSft: 'xxx',
        slotInShareSft:
          '10171050319075320644586539334401394801050934983625915448386431993435893492954',
      },
      {
        id: '0x0ef01fb59f931e3a3629255b04ce29f6cd428f674944789288a1264a79c7c931',
        name: 'MUX USDT - A',
        currencyAddress: getAddress(
          '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        ),
        slotInRedemptionSft: 'xxx',
        slotInShareSft:
          '17873186957027148109033339637575361280044016486300679380351688892728620516739',
      },
    ],
  },
  {
    chainId: Chain.Bsc,
    navOracleAddress: getAddress('0x9C491539AeC346AAFeb0bee9a1e9D9c02AB50889'),
    openFundMarketAddress: getAddress(
      '0xaE050694c137aD777611286C316E5FDda58242F3',
    ),
    openFundRedemptionDelegateAddress: getAddress(
      '0xe16cec2f385ea7a382772334a44506a865f98562',
    ),
    openFundRedemptionConcreteAddress: getAddress(
      '0x59999fe6a26c048f623a7476344702de56633cF4',
    ),
    openFundShareDelegateAddress: getAddress(
      '0xb816018e5d421e8b809a4dc01af179d86056ebdf',
    ),
    openFundShareConcreteAddress: getAddress(
      '0x7851fA49C56f8996444C869534CA311C0eAB3854',
    ),
    pools: [
      {
        id: '0xef1a10327aa5ed6c70af4fe28178cd4cece1c08e1e5bc0314137feda1f5abf74',
        name: 'SolvBTC BNB LP Vault - BSC - B',
        currencyAddress: getAddress(
          '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        ),
        slotInRedemptionSft: 'xxxx',
        slotInShareSft:
          '67766898239605156258501380852207923193619740467985810194663587771723472117631',
      },
      {
        id: '0xc9a3cc0fd04075fe81649f4d53b1ed33f2e06b9a91ece50f891d370901fc7299',
        name: 'SolvBTC LP Vault - BSC',
        currencyAddress: getAddress(
          '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        ),
        slotInRedemptionSft: 'xxx',
        slotInShareSft:
          '107795438894633394025820351322700143223339318121737007372144016231468215188882',
      },
    ],
  },
]
