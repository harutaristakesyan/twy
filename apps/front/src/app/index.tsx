import ReactDOM from 'react-dom/client'
import React from 'react'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@ant-design/v5-patch-for-react-19'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
})

const Devtools = React.lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))

const Root = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && (
        <React.Suspense fallback={null}>
          <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
        </React.Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>
)

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
