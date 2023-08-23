import { getPrices } from '..'

async function run() {
  const data = await getPrices({})

  console.log(
    JSON.stringify(
      data,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  )
}

run()
