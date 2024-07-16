import { scenarios } from './scenarios/index.js'
import http from 'k6/http'
import { check } from 'k6'

// Define a mapping from chain names to provider URLs
const providers = {
  ethereum: 'https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  optimism:
    'https://optimism-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  bsc: 'https://bscrpc.com',
  polygon:
    'https://polygon-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  fantom: 'https://rpc.ftm.tools',
  base: 'https://base-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  arbitrum:
    'https://arbitrum-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  avalanche:
    'https://avalanche-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
  linea: 'https://linea-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02',
}

const scenarioName = __ENV.SCENARIO_NAME
const chainName = __ENV.CHAIN_NAME.toLowerCase() // Read chain name from environment variable

if (!chainName || !providers[chainName]) {
  throw new Error(
    `Invalid or missing chain name. Available chains: ${Object.keys(
      providers,
    ).join(', ')}`,
  )
}

export const options = scenarios[scenarioName]
if (!options)
  throw new Error(
    `No options found! Please make sure the scenario name ${scenarioName} is correct, and properly registered in load/scenarios/index.js. ${JSON.stringify(
      scenarios.default,
    )}`,
  )

const statusCounts = {}

export function setup() {
  console.log('Setup hook called')

  return {
    info: 'setup',
  }
}

// Function to generate a random Ethereum address
function generateRandomEthAddress() {
  const hexChars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 40; i++) {
    address += hexChars[Math.floor(Math.random() * 16)]
  }
  return address
}

// Function to pad Ethereum address to 32 bytes
function padEthAddress(address) {
  return `0x${'0'.repeat(24)}${address.slice(2)}`
}

// The function that defines VU logic.
export default function (data) {
  const url = providers[chainName]
  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const randomAddress = generateRandomEthAddress()
  const paddedAddress = padEthAddress(
    '0xF977814e90dA44bFA03b6295A0616a897441aceC',
  )

  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getLogs',
    params: [
      {
        fromBlock: '0x0',
        toBlock: 'latest',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          null,
          paddedAddress,
        ],
      },
    ],
  })

  const response = http.post(url, payload, options)

  // Log the response status and body
  //   console.log(`Response status: ${response.status}`)
  //   console.log(`Response body: ${response.body}`)

  // Track status counts
  if (statusCounts[response.status]) {
    statusCounts[response.status]++
  } else {
    statusCounts[response.status] = 1
  }

  // Parse the response body
  let responseBody
  try {
    responseBody = JSON.parse(response.body)
  } catch (e) {
    console.error(`Failed to parse response body: ${e.message}`)
    responseBody = {}
  }

  // Check if the response contains an error
  const hasError = responseBody.error !== undefined

  //   // Log an appropriate message based on the presence of an error
  //   if (hasError) {
  //     console.error(`Error: ${responseBody.error.message}`)
  //     console.error(`Error data: ${JSON.stringify(responseBody.error.data)}`)
  //   } else {
  //     console.log('No error in the response')
  //   }

  // Check for "rate" or "limit" in the response or error message
  const containsRateOrLimit = hasError
    ? /rate|limit/i.test(responseBody.error.message)
    : /rate|limit/i.test(JSON.stringify(responseBody))

  //   // Log the presence of "rate" or "limit"
  //   if (containsRateOrLimit) {
  //     console.log('Response or error message contains "rate" or "limit".')
  //   } else {
  //     console.log('Response or error message does not contain "rate" or "limit".')
  //   }

  // Check for the specific error message
  const containsSpecificError =
    hasError &&
    /query returned more than 10000 results/i.test(responseBody.error.message)

  //   // Log the presence of the specific error message
  //   if (containsSpecificError) {
  //     console.log(
  //       'Error message contains "query returned more than 10000 results".',
  //     )
  //   } else {
  //     console.log(
  //       'Error message does not contain "query returned more than 10000 results".',
  //     )
  //   }

  // Add checks to ensure the request status is 200 and there is no error
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response does not contain error': (r) => !hasError,
    'response or error does not contains rate or limit': (r) =>
      !containsRateOrLimit,
    'response or error does not contains more than 10000 error message': (r) =>
      !containsSpecificError,
  })
}

export function teardown(data) {
  console.log('Test run completed. Status code summary:')
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`Status ${status}: ${count}`)
  }
}
