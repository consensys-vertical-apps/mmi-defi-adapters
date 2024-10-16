import type { DefiProvider } from '@metamask-institutional/defi-adapters'

export const provider = {
  getPositions: async (input: Parameters<DefiProvider['getPositions']>[0]) => {
    fetch('http://localhost:3000/positions', {
      method: 'POST',
      body: JSON.stringify(input),
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
  getProfits: async (input: Parameters<DefiProvider['getProfits']>[0]) => {
    fetch('http://localhost:3000/profits', {
      method: 'POST',
      body: JSON.stringify(input),
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
} as unknown as DefiProvider
