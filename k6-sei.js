import http from 'k6/http'
import { check, sleep } from 'k6'

// Infura Sei endpoint (replace with your actual Infura project ID)
const INFURA_SEI_URL =
  'https://mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02'

// Helper to make JSON-RPC requests
function jsonRpcRequest(method, params = []) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  })
  const headers = { 'Content-Type': 'application/json' }
  return http.post(INFURA_SEI_URL, payload, { headers })
}

export default function () {
  // 1. Get latest block number
  const latestBlockRes = jsonRpcRequest('eth_blockNumber')
  check(latestBlockRes, { 'got latest block': (r) => r.status === 200 })

  const latestBlockHex = JSON.parse(latestBlockRes.body).result
  const latestBlockNum = Number.parseInt(latestBlockHex, 16)

  // 2. Get receipts for last 1000 blocks
  for (let i = latestBlockNum; i > latestBlockNum - 410; i--) {
    const blockNumHex = `0x${i.toString(16)}`
    // eth_getBlockReceipts is not standard, but some Sei endpoints support it
    const res = jsonRpcRequest('eth_getBlockReceipts', [blockNumHex])
    // console.log(`Receipts for block ${blockNumHex}:`, res.body)
    check(res, { 'got receipts': (r) => r.status === 200 })
    sleep(0.1) // avoid rate limits
  }
}
