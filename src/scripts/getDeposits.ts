import { getDeposits } from '..'

async function run() {
  const data = await getDeposits({
    userAddress: '0x2C5D4A0943e9cF4C597a76464396B0bF84C24C45',
    fromBlock: 17719334,
    toBlock: 17719336,
  })

  console.log(
    JSON.stringify(
      data,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  )
}

run()
