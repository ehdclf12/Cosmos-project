import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
})

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setReady(true)
      } else {
        supabase.auth.signInAnonymously().finally(() => setReady(true))
      }
    })
  }, [])

  if (!ready) return null

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  )
}
