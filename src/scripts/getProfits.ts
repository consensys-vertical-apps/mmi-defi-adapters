import { getTodaysProfits } from '..'

async function run(userAddress: string) {
  const data = await getTodaysProfits({
    userAddress,
  })

  console.log(
    JSON.stringify(
      data,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  )
}

const userAddress =
  process.argv[2] || '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b'
run(userAddress)
