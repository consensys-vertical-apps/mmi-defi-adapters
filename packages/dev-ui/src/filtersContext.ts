import React from 'react'
import { useContext } from 'react'

type FiltersContext = {
  userAddress: string
  protocolOptions: {
    value: string
    label: string
  }[]
  chainOptions: {
    value: number
    label: string
  }[]
  protocolIds?: {
    value: string
    label: string
  }[]
  chainIds?: {
    value: number
    label: string
  }[]

  setFilters: (filters: {
    userAddress: string
    protocolIds?: {
      value: string
      label: string
    }[]
    chainIds?: {
      value: number
      label: string
    }[]
  }) => void
}
export const FiltersContext = React.createContext<FiltersContext | null>(null)

export function useFiltersContext() {
  const context = useContext(FiltersContext)

  if (!context) {
    throw new Error('useFiltersContext must be used within a FiltersProvider')
  }

  return context
}
