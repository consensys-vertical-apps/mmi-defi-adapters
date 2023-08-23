import { getPositions } from '..'

async function run(userAddress: string) {
  const data = await getPositions({
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
  process.argv[2] || '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255'
run(userAddress)
