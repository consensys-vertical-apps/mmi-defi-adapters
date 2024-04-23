import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Positions } from './Positions'
import { Profits } from './Profits'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const queryClient = new QueryClient()

function App() {
  return (
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
    </QueryClientProvider>
  )
}

export default App
