import {
  DefiPositionResponse,
  DefiProvider,
} from '@metamask-institutional/defi-adapters'
import { useEffect, useState } from 'react'

function App() {
  const [positions, setPositions] = useState<DefiPositionResponse[]>([])

  useEffect(() => {
    const init = async () => {
      const provider = new DefiProvider()
      const positions = await provider.getPositions({
        userAddress: '0x92832b0f4435e1c4510bd601727356b738c99312',
        filterProtocolIds: ['lido'],
        filterChainIds: [1],
      })

      setPositions(positions)
    }
    init()
  }, [])

  return (
    <>
      {/* <TableDemo /> */}
      <pre>
        {JSON.stringify(
          positions,
          (_, value) =>
            typeof value === 'bigint' ? `${value.toString()}n` : value,
          2,
        )}
      </pre>
    </>
  )
}

export default App
