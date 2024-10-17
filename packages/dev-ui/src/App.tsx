import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Positions } from './Positions'
import { Profits } from './Profits'
import { provider } from './defiAdapterLibrary'
import { FiltersContext } from './filtersContext'
import { ChainIdToChainNameMap } from './chainIdToChainNameMap'
import { Chain } from '@metamask-institutional/defi-adapters'

function App() {
  const { isPending, error, data } = useQuery({
    queryKey: ['support'],
    queryFn: async () => {
      const support = (await provider.getSupport()) as Record<
        string,
        { chains: number[] }[]
      >

      const protocolOptions = Object.keys(support)
        .sort()
        .map((value) => ({
          value,
          label: ChainIdToChainNameMap[+value as unknown as Chain],
        }))

      const chainOptions = Array.from(
        new Set(
          Object.values(support).reduce<number[]>((previous, current) => {
            previous.push(...current.flatMap((value) => value.chains))
            return previous
          }, []),
        ),
      )
        .sort()
        .map((value) => ({
          value,
          label: ChainIdToChainNameMap[value as Chain],
        }))

      return {
        protocolOptions,
        chainOptions,
      }
    },
  })

  const [userAddress, setUserAddress] = useState(
    localStorage.getItem('defi-adapters:userAddress') || '',
  )
  const [protocolIds, setProtocolIds] = useState<
    | {
        value: string
        label: string
      }[]
    | undefined
  >(
    localStorage.getItem('defi-adapters:protocolIds')?.length
      ? localStorage
          .getItem('defi-adapters:protocolIds')
          ?.split(',')
          .map((valueAndLabel) => {
            const [value, label] = valueAndLabel.split(':')
            return {
              value,
              label,
            }
          })
      : undefined,
  )
  const [chainIds, setChainIds] = useState<
    | {
        value: number
        label: string
      }[]
    | undefined
  >(
    localStorage.getItem('defi-adapters:chainIds')?.length
      ? localStorage
          .getItem('defi-adapters:chainIds')
          ?.split(',')
          .map((valueAndLabel) => {
            const [value, label] = valueAndLabel.split(':')
            return {
              value: Number(value),
              label,
            }
          })
      : undefined,
  )

  if (isPending) {
    return <div>Loading...</div>
  }

  if (error || !data) {
    return <div>Error: {error?.message || 'Unknown error'}</div>
  }

  return (
    <FiltersContext.Provider
      value={{
        userAddress,
        protocolOptions: data.protocolOptions,
        chainOptions: data.chainOptions,
        protocolIds,
        chainIds,
        setFilters: ({ userAddress, protocolIds, chainIds }) => {
          setUserAddress(userAddress)
          setProtocolIds(protocolIds)
          setChainIds(chainIds)

          localStorage.setItem('defi-adapters:userAddress', userAddress)
          localStorage.setItem(
            'defi-adapters:protocolIds',
            protocolIds?.length
              ? protocolIds
                  ?.map(({ value, label }) => `${value}:${label}`)
                  .join(',')
              : '',
          )
          localStorage.setItem(
            'defi-adapters:chainIds',
            chainIds?.length
              ? chainIds
                  ?.map(({ value, label }) => `${value}:${label}`)
                  .join(',')
              : '',
          )
        },
      }}
    >
      <div className="w-[70%] mx-auto">
        <header className="text-center py-4">
          <h1 className="text-2xl font-bold">DeFi Adapters Library</h1>
        </header>
        <Tabs defaultValue="positions" className="w-full">
          <TabsList>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="profits">Profits</TabsTrigger>
          </TabsList>
          <TabsContent value="positions">
            <Positions />
          </TabsContent>
          <TabsContent value="profits">
            <Profits />
          </TabsContent>
        </Tabs>
      </div>
    </FiltersContext.Provider>
  )
}

export default App
