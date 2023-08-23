import { getTotalValueLocked } from '..'

async function run() {
  const data = await getTotalValueLocked({})

  console.log(
    JSON.stringify(
      data,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  )
}

run()
