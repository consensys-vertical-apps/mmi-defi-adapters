import { DefiProvider } from '@metamask-institutional/defi-adapters'

export const provider = new DefiProvider({
    enableFailover: false,
})
