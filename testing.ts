import {
  ethers,
  AbiCoder,
  getBytes,
  hexlify,
  keccak256,
  toUtf8Bytes,
} from 'ethers'

function encodeData(dataTypes, dataValues) {
  const bytes = AbiCoder.defaultAbiCoder().encode(dataTypes, dataValues)
  return hexlify(bytes)
}

function hashData(dataTypes, dataValues) {
  const bytes = AbiCoder.defaultAbiCoder().encode(dataTypes, dataValues)
  const hash = keccak256(getBytes(bytes))

  return hash
}

function hashString(string) {
  return hashData(['string'], [string])
}

function magic(value: string) {
  const bytes = AbiCoder.defaultAbiCoder().encode(['string'], [value])
  return keccak256(bytes)
}

function keccakString(string) {
  return keccak256(toUtf8Bytes(string))
}

const rpcUrl =
  'https://arbitrum-mainnet.infura.io/v3/abafec30d6aa45ffa0c763b5552a2d02'

// DEPLOYMENTS
const dataStore = '0xfd70de6b91282d8017aa4e741e9ae325cab992d8'
const reader = '0x23d4da5c7c6902d4c86d551cae60d5755820df9e'
const readerUtils = '0x0597fb70ff1b3081c9b27a9effd1407df1b4035f'
const marketStoreUtils = '0x42ce973D286B66bE825fB5571C6707d54543247e'
const readerPositionUtils = '0xa7bb93c5361bd6fe66408dcc0a9d98a25a1b2d88'

const MARKET_LIST = magic('MARKET_LIST')

async function getAddressCount(setKey: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const abi = [
    'function getAddressCount(bytes32 setKey) external view returns (uint256)',
  ]
  const contract = new ethers.Contract(dataStore, abi, provider)
  const count = await contract.getAddressCount(setKey)
  return count
}

getAddressCount(MARKET_LIST).then(console.log).catch(console.error)
