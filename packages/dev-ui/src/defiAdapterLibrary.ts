import type { DefiProvider } from '@codefi/mmi-defi-adapters'

type ApiResponse<T> = Promise<{
  data: Awaited<T>
}>

export const provider = {
  getSupport: async (
    input?: Parameters<DefiProvider['getSupport']>[0],
  ): ApiResponse<ReturnType<DefiProvider['getSupport']>> => {
    const urlParams = Object.entries(input ?? {}).reduce(
      (acc, [key, value]) => {
        if (value) {
          acc.append(key, JSON.stringify(value))
        }
        return acc
      },
      new URLSearchParams(),
    )

    return fetch(`http://localhost:3000/support?${urlParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((res) => {
      if (res.ok) {
        return res.json()
      }
      throw new Error('Failed to fetch')
    })
  },
  getPositions: async (
    input: Parameters<DefiProvider['getPositions']>[0],
  ): ApiResponse<ReturnType<DefiProvider['getPositions']>> => {
    const { userAddress, ...searchParams } = input
    const urlParams = Object.entries(searchParams).reduce(
      (acc, [key, value]) => {
        if (value) {
          acc.append(key, JSON.stringify(value))
        }
        return acc
      },
      new URLSearchParams(),
    )

    return fetch(
      `http://localhost:3000/positions/${userAddress}?${urlParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ).then((res) => {
      if (res.ok) {
        return res.json()
      }
      throw new Error('Failed to fetch')
    })
  },
}
