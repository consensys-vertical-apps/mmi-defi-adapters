import { getTotalValueLocks } from '..'

async function run() {
  const data = await getTotalValueLocks({})

  console.log(
    JSON.stringify(
      data,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  )
}

run()
