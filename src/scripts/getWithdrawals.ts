import { getWithdrawals } from '..'

async function run() {
  const data = await getWithdrawals({
    userAddress: '0x4Ffc5F22770ab6046c8D66DABAe3A9CD1E7A03e7',
    fromBlock: 17979753,
    toBlock: 17979755,
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
