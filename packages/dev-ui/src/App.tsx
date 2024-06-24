import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { Positions } from './Positions'
import { Profits } from './Profits'
import { FiltersContext } from './filtersContext'

const queryClient = new QueryClient()

function App() {
  const [userAddress, setUserAddress] = useState('')
  const [protocolIds, setProtocolIds] = useState<
    | {
        value: string
        label: string
      }[]
    | undefined
  >()
  const [chainIds, setChainIds] = useState<
    | {
        value: number
        label: string
      }[]
    | undefined
  >()

  return (
    <FiltersContext.Provider
      value={{
        userAddress,
        protocolIds,
        chainIds,
        setFilters: ({ userAddress, protocolIds, chainIds }) => {
          setUserAddress(userAddress)
          setProtocolIds(protocolIds)
          setChainIds(chainIds)
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
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
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </FiltersContext.Provider>
  )
}

export default App
