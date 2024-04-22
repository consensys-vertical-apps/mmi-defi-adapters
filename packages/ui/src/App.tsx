import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Positions } from './Positions'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-[70%] mx-auto">
        <header className="text-center py-4">
          <h1 className="text-2xl font-bold">DeFi Adapters Library</h1>
        </header>
        <Positions />
      </div>
    </QueryClientProvider>
  )
}

export default App
