import http from 'k6/http'
import { check } from 'k6'
import { Trend } from 'k6/metrics'

const addresses = [
  '0x47ab2ba28c381011fa1f25417c4c2b2c0d5b4781',
  '0xB82e12d1da436611C5C94d535C3a40F5fB3f35Ab',
  '0x4f575BDdc36c3Ec42D923AEeEc4Ada1a60ce4086',
  '0xb83F1688C0b7ebb155a830ae78F71527Ef55e759',
  '0x5d14d2fc18f592b0fe5f6ce1ae091380294dcf71',
  '0x10fd41ec6FDFE7f9C7Cc7c12DC4f0B4e77659BfA',
  '0x9EDCE78578a8128287e65e6e293f1DaedD57451D',
  '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
  '0x278a8453ECf2f477a5Ab3Cd9b0Ea410b7B2C4182',
  '0x891ca7e61d3868B9eDbF20dDd045Fc7D579E77d5',
  '0x9b2e3525a6e707ED2825E39ECe9ba46a7dbd7A43',
  '0xF23c8539069C471F5C12692a3471C9F4E8B88BC2',
  '0xDB2a2f53e2bC952Abde8Aa1cC32F09dFF35F7C42',
  '0x9e3F12527831E59760D79E17a36CE695998F2afB',
  '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
  '0x3130d2b8cbf0798bb1cbf2a4f527dbae953ff27f',
  '0x83524B9EFF5d76Ee4Dba5Bb78B8B2e8BaD3a00Be',
  '0xb58796c7e02852D46bE2d82c7aCCd4524a43b9dE',
  '0xE227836Af161c8194D982a658BEF21F2fD594BDA',
  '0xe141062f056c612a3f013d354ab89edadaf38ffd',
  '0xdEdB5F78Dabf7541C3367080695Eb51458Cd5317',
  '0x21C9474156e830C30709e300911dB6Be509559c4',
  '0xdf286De6d3de10A6aD6452d0BA94Af7AD7B68F9B',
  '0x270035C9073c52eE3509Ae8B9821653488F92B39',
  '0x0034daf2e65F6ef82Bc6F893dbBfd7c232a0e59C',
  '0x8654a995426e775f3ef023cd6e1b5681e774ffa1',
  '0x4d9ad4C310856A582b294726a4fa7a97b2169dC7',
  '0x5ae3E5Cda4aaa9204dB5be726b30804483580a95',
  '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
  '0x492d896d2244026a60cf3c46ec742d041a34c4cb',
  '0x394A16eeA604fBD86B0b45184b2d790c83a950E3',
  '0xF9F7AcA75cf438CE22184331a66591A02dF3a216',
  '0xa5cCBD739e7f5662b95D269ee9A48a37cBFb88Bc',
  '0x3F843189280A4379EB12B928afD5D96Df8076679',
  '0x577c6a57c435b53c7d5c6878c7736b9781c778a3',
  '0x005fb56fe0401a4017e6f046272da922bbf8df06',
  '0x61Be170a52A61b318ACcF8Fc77153454B4bd5c78',
  '0xd3363fA4E7EDdA471527d960D65EFBc6351cC094',
  '0x566d2176Ecb1d8eA07D182b47B5aC57511337E00',
  '0x51525Be6985e1B1c46f746a231B1d186B52860DC',
  '0xd73B2cA04C6392df262dd756d3E4e27ad32308A6',
  '0x9fcc67d7db763787bb1c7f3bc7f34d3c548c19fe',
  '0x7fe4b2632f5ae6d930677d662af26bc0a06672b3',
  '0x34d3D57df5f06335C4a064f0E26FcDDC78516498',
  '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
  '0xb5b29320d2Dde5BA5BAFA1EbcD270052070483ec',
  '0x38989BBA00BDF8181F4082995b3DEAe96163aC5D',
  '0x9CBF099ff424979439dFBa03F00B5961784c06ce',
  '0xDA44D84f8DE69fEBDa4C4e0B89fF24077413f4b0',
  '0x7C818D46ACEf870ea88137BF553594f4803872cA',
  '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',
  '0x426c4966fC76Bf782A663203c023578B744e4C5E',
  '0xf26898ad64a3f05df5b9b5f7868703a0ab272205',
  '0x15742F8Aea5b6E5c79A98420F8a18E77717a4bbc',
  '0x117C99451cae094B3a7d56C9d3A97c96900b8e7A',
  '0x46896eB79d926712E1134fad5ACBaAF53c1cbE74',
  '0x1BeE69b7dFFfA4E2d53C2a2Df135C388AD25dCD2',
  '0x7BFEe91193d9Df2Ac0bFe90191D40F23c773C060',
  '0xEBFAEEDE1D85E8E87BDe9326bc301830D55dfa8c',
  '0xabef19a5Cb082D0e512eB28363B1229B25BaB9a7',
  '0xf8dE75c7B95edB6f1E639751318f117663021Cf0',
  '0x96E9a50A3b8B4AE1fAB47f26C3F78E148563380A',
  '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
  '0x432e73a263aa7a4b909ad8afecdda0479305e187',
  '0x006fbb8a8aeb9982b54ec213a675a19b121b3423',
  '0x730964F8850708D16f6E455346EB7BC8042c737B',
  '0x6372baD16935878713e5e1DD92EC3f7A3C48107E',
  '0xd02495dcd1f82b1706c6b5e19d5dd01cfa49177b',
  '0x1F14bE60172b40dAc0aD9cD72F6f0f2C245992e8',
  '0xA20EA526a2B2e2471A43Cb981D613FEeeF27c9AF',
  '0xa3e8c7e7402565d4476661f37bd033bb8d960e49',
  '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
  '0x69D727a5F4731271C36DC600AE9fa3E6F3Ae29B6',
  '0x394F94ca8Dec8D0bD48c738AB28dCe146a67Bbd9',
  '0x67e5cc743aF5B1b4446c44fCCDc3aAe21f844AcF',
  '0x51b93f0ca523faf0afE6F7049Cfd4aFdc513BcE5',
  '0x947b7d38421E2701852246Cf18EF6AE19C299BF3',
  '0xB1C95aC3fcFB2A21A79BA5f95Cce0Ff2237f1692',
  '0x36384b230F079Ef0813B68e3938E1A135d6e7A26',
  '0x291f1593C2bA68974bC6E0AE715b52ee313813A6',
  '0x8914fc85e44befedbd7a1f22e2469a8739b05c8a',
  '0xd03d26b36642c8137c77AE8fe91E205252db1095',
  '0xe480d4e05C8C32Dc3C00A20adD4560E482fc33B1',
  '0x7a8FEaAdBA4360697228aA9b2a5EBaa769F68905',
  '0xaA62CF7caaf0c7E50Deaa9d5D0b907472F00B258',
  '0x9bb2fac54f168bce6986c3856fcb42d5c365b689',
  '0x81040dae0d9db2cad734da39bf4a14e46d77feb3',
  '0xe510668b3f77f4d3be91072fd484f2e6134e65ff',
  '0x466fE5825B096cEF0f4B3C2E9B4185e042c6E4f0',
  '0x61e17C36c0f177c6A46F9Ae531E621D18c1aCD93',
  '0x5Cd2d1EA68d962d4687B47604b062156c23E5889',
  '0x3130D2b8cbf0798bb1cBf2a4F527dBaE953FF27f',
  '0x00000000863b56a3c1f0f1be8bc4f8b7bd78f57a',
  '0x1D3DC4b584bc687fB3C9AdC1761858694728B1b3',
]

export const options = {
  scenarios: {
    // Load test: steady load, 1 iteration per address
    load_test: {
      executor: 'per-vu-iterations',
      vus: addresses.length, // 94 concurrent VUs
      iterations: addresses.length, // 94 iterations
      maxDuration: '5m',
      exec: 'default',
    },
    // Stress test: ramp up to 3x addresses, then hold
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: addresses.length * 3 },
        { duration: '3m', target: addresses.length * 3 },
        { duration: '1m', target: 0 },
      ],
      exec: 'default',
      gracefulRampDown: '30s',
    },
    // // Spike test: sudden spike to 5x addresses, then drop
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: addresses.length * 5,
      maxVUs: addresses.length * 5,
      stages: [
        { target: addresses.length * 5, duration: '10s' },
        { target: addresses.length * 5, duration: '30s' },
        { target: 1, duration: '10s' },
      ],
      exec: 'default',
    },
    // // Soak test: steady load for 30 minutes
    soak_test: {
      executor: 'constant-vus',
      vus: addresses.length,
      duration: '30m',
      exec: 'default',
    },
  },
}

const totalPositionsMetric = new Trend(
  'total_positions_per_address_ignore_ms_unit',
  true,
)

export default function () {
  console.log(
    `VU ${__VU} of ${__ITER} - Fetching defi adapters for address: ${addresses[__VU - 1]}`,
  )
  const address = addresses[__VU - 1]
  const url = `https://defiadapters.api.cx.metamask.io/positions/${address}`
  const res = http.get(url)

  const response = res.json()

  const defiData = Array.isArray(response.data) ? response.data : []
  const totalTokens = defiData.reduce(
    (sum, protocolChainAdapter) =>
      sum +
      (Array.isArray(protocolChainAdapter.tokens)
        ? protocolChainAdapter.tokens.length
        : 0),
    0,
  )
  // Record total positions for this VU
  totalPositionsMetric.add(totalTokens)

  // const line =
  //   defiData.length > 0
  //     ? `Address: ${address}, Defi adapters count: ${defiData.length}, Total positions count: ${totalTokens}\n`
  //     : `No defi data found for address: ${address}\n`
  // // In k6, console.log output can be redirected to a file using --out
  // console.log(line)

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response is array': () => Array.isArray(response.data),
    'all adapters successful': (r) =>
      Array.isArray(response.data) &&
      response.data.every((adapter) => adapter.success === true),
  })
}
